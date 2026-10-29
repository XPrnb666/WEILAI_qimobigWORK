import shutil
import tempfile

from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from .models import UserProfile


TEMP_MEDIA_ROOT = tempfile.mkdtemp()


@override_settings(MEDIA_ROOT=TEMP_MEDIA_ROOT)
class AvatarApiTests(TestCase):
    """头像上传 / 删除"""

    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(TEMP_MEDIA_ROOT, ignore_errors=True)

    def setUp(self):
        self.user = User.objects.create_user(username="alice", password="pass1234")
        self.token, _ = Token.objects.get_or_create(user=self.user)
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token.key}")

    def _upload(self, name="avatar.png", content_type="image/png", size=1024):
        return SimpleUploadedFile(name, b"x" * size, content_type=content_type)

    def test_upload_requires_authentication(self):
        self.assertEqual(APIClient().post("/api/users/avatar/").status_code, 401)

    def test_upload_without_file_returns_400(self):
        resp = self.client.post("/api/users/avatar/", {}, format="multipart")
        self.assertEqual(resp.status_code, 400)

    def test_upload_rejects_unsupported_type(self):
        resp = self.client.post(
            "/api/users/avatar/", {"avatar": self._upload(content_type="text/plain")}, format="multipart"
        )
        self.assertEqual(resp.status_code, 400)

    def test_upload_rejects_oversized_file(self):
        resp = self.client.post(
            "/api/users/avatar/",
            {"avatar": self._upload(size=2 * 1024 * 1024 + 1)},
            format="multipart",
        )
        self.assertEqual(resp.status_code, 400)

    def test_upload_returns_avatar_url(self):
        resp = self.client.post(
            "/api/users/avatar/", {"avatar": self._upload()}, format="multipart"
        )
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.data["avatar"])
        profile = UserProfile.objects.get(user=self.user)
        self.assertTrue(profile.avatar.name)

    def test_delete_clears_avatar(self):
        self.client.post("/api/users/avatar/", {"avatar": self._upload()}, format="multipart")
        resp = self.client.delete("/api/users/avatar/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["avatar"], "")
        profile = UserProfile.objects.get(user=self.user)
        self.assertFalse(profile.avatar.name)
