from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from .models import Task


class AuthApiTests(TestCase):
    """登录 / 注册 / 登出 / 当前用户"""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username="alice", password="pass1234")

    def test_login_returns_token_and_user(self):
        resp = self.client.post(
            "/api/auth/login/", {"username": "alice", "password": "pass1234"}, format="json"
        )
        self.assertEqual(resp.status_code, 200)
        self.assertIn("token", resp.data)
        self.assertEqual(resp.data["user"]["username"], "alice")

    def test_login_with_wrong_password_returns_401(self):
        resp = self.client.post(
            "/api/auth/login/", {"username": "alice", "password": "bad"}, format="json"
        )
        self.assertEqual(resp.status_code, 401)

    def test_register_creates_user_and_token(self):
        resp = self.client.post(
            "/api/auth/register/", {"username": "bob", "password": "pass1234"}, format="json"
        )
        self.assertEqual(resp.status_code, 201)
        self.assertTrue(User.objects.filter(username="bob").exists())
        self.assertIn("token", resp.data)

    def test_register_with_duplicate_username_returns_400(self):
        resp = self.client.post(
            "/api/auth/register/", {"username": "alice", "password": "pass1234"}, format="json"
        )
        self.assertEqual(resp.status_code, 400)

    def test_me_requires_token(self):
        self.assertEqual(self.client.get("/api/auth/me/").status_code, 401)

        token, _ = Token.objects.get_or_create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
        resp = self.client.get("/api/auth/me/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["username"], "alice")

    def test_logout_invalidates_token(self):
        token, _ = Token.objects.get_or_create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")
        self.assertEqual(self.client.post("/api/auth/logout/").status_code, 200)
        self.assertEqual(self.client.get("/api/auth/me/").status_code, 401)


class TaskApiTests(TestCase):
    """任务 CRUD 与多用户隔离"""

    def setUp(self):
        self.alice = User.objects.create_user(username="alice", password="pass1234")
        self.bob = User.objects.create_user(username="bob", password="pass1234")
        self.alice_token = Token.objects.create(user=self.alice)
        self.bob_token = Token.objects.create(user=self.bob)

        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.alice_token.key}")

    def test_list_requires_authentication(self):
        self.assertEqual(APIClient().get("/api/tasks/").status_code, 401)

    def test_create_task_sets_owner_from_token(self):
        resp = self.client.post(
            "/api/tasks/",
            {"title": "写周报", "category": "工作", "dueDate": "2026-11-01"},
            format="json",
        )
        self.assertEqual(resp.status_code, 201)
        task = Task.objects.get(id=resp.data["id"])
        self.assertEqual(task.owner, self.alice)
        self.assertEqual(resp.data["dueDate"], "2026-11-01")
        # 响应里带完整字段，owner 不可由前端伪造
        self.assertEqual(resp.data["owner"]["username"], "alice")

    def test_create_task_with_blank_title_returns_400(self):
        resp = self.client.post("/api/tasks/", {"title": "   "}, format="json")
        self.assertEqual(resp.status_code, 400)

    def test_list_only_returns_own_tasks(self):
        Task.objects.create(owner=self.alice, title="A 的任务")
        Task.objects.create(owner=self.bob, title="B 的任务")
        resp = self.client.get("/api/tasks/")
        self.assertEqual(resp.status_code, 200)
        titles = [item["title"] for item in resp.data]
        self.assertEqual(titles, ["A 的任务"])

    def test_cannot_read_other_users_task(self):
        task = Task.objects.create(owner=self.bob, title="B 的任务")
        self.assertEqual(self.client.get(f"/api/tasks/{task.id}/").status_code, 404)

    def test_cannot_update_other_users_task(self):
        task = Task.objects.create(owner=self.bob, title="B 的任务")
        resp = self.client.patch(f"/api/tasks/{task.id}/", {"completed": True}, format="json")
        self.assertEqual(resp.status_code, 404)

    def test_cannot_delete_other_users_task(self):
        task = Task.objects.create(owner=self.bob, title="B 的任务")
        self.assertEqual(self.client.delete(f"/api/tasks/{task.id}/").status_code, 404)

    def test_partial_update_completed(self):
        task = Task.objects.create(owner=self.alice, title="读书")
        resp = self.client.patch(f"/api/tasks/{task.id}/", {"completed": True}, format="json")
        self.assertEqual(resp.status_code, 200)
        task.refresh_from_db()
        self.assertTrue(task.completed)

    def test_filter_by_category_and_status(self):
        Task.objects.create(owner=self.alice, title="工作 A", category="工作")
        Task.objects.create(owner=self.alice, title="工作 B", category="工作", completed=True)
        Task.objects.create(owner=self.alice, title="学习 C", category="学习")

        resp = self.client.get("/api/tasks/?category=工作&status=active")
        self.assertEqual([item["title"] for item in resp.data], ["工作 A"])

        resp = self.client.get("/api/tasks/?status=completed")
        self.assertEqual([item["title"] for item in resp.data], ["工作 B"])
