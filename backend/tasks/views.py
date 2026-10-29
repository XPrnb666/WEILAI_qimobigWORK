from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from rest_framework import permissions, status, viewsets
from rest_framework.authtoken.models import Token
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Task
from .serializers import (
    AuthResponseSerializer,
    RegisterSerializer,
    TaskCreateUpdateSerializer,
    TaskSerializer,
    UserSerializer,
)


class IsOwner(permissions.BasePermission):
    """只允许任务 owner 访问；SAFE_METHODS 允许任何登录用户"""

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        return obj.owner_id == request.user.id


class LoginView(APIView):
    """用户名密码登录 → 返回 Token"""

    permission_classes = (permissions.AllowAny,)
    authentication_classes = ()

    def post(self, request):
        username = request.data.get("username", "").strip()
        password = request.data.get("password", "")
        user = authenticate(username=username, password=password)
        if user is None:
            return Response(
                {"detail": "用户名或密码错误"}, status=status.HTTP_401_UNAUTHORIZED
            )
        token, _ = Token.objects.get_or_create(user=user)
        return Response(
            {"token": token.key, "user": UserSerializer(user).data},
            status=status.HTTP_200_OK,
        )


class RegisterView(APIView):
    """注册新用户 → 创建 Token → 直接登录"""

    permission_classes = (permissions.AllowAny,)
    authentication_classes = ()

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        token, _ = Token.objects.get_or_create(user=user)
        return Response(
            {"token": token.key, "user": UserSerializer(user).data},
            status=status.HTTP_201_CREATED,
        )


class LogoutView(APIView):
    """登出 → 删除当前 Token"""

    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        try:
            request.auth.delete()
        except AttributeError:
            pass
        return Response({"detail": "已登出"}, status=status.HTTP_200_OK)


class CurrentUserView(APIView):
    """获取当前登录用户信息（刷新页面时确认 Token 仍有效）"""

    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        return Response(UserSerializer(request.user, context={"request": request}).data)


class TaskViewSet(viewsets.ModelViewSet):
    """
    Task CRUD。

    - 登录用户才能访问
    - 只能看到和修改自己的任务
    - 列表/详情 + 创建/更新响应 **统一用 TaskSerializer**（完整字段，含 id/owner/timestamps）
    - 但创建/更新的**输入校验**用 TaskCreateUpdateSerializer（防伪造 owner）
    """

    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        qs = Task.objects.filter(owner=self.request.user)
        # 手动支持 DRF 默认没有的 query param 过滤（不用引 django-filter）
        category = self.request.query_params.get("category", "").strip()
        if category:
            qs = qs.filter(category=category)
        status_param = self.request.query_params.get("status", "").strip()
        if status_param == "active":
            qs = qs.filter(completed=False)
        elif status_param == "completed":
            qs = qs.filter(completed=True)
        return qs

    def get_serializer_class(self):
        # 仅输入校验用简化版；渲染响应始终用完整版
        if self.action in ("create", "update", "partial_update") and self.request.method in (
            "POST", "PUT", "PATCH",
        ):
            # DRF 会在 initial_data 时调用 get_serializer_class() 做校验
            # 也会在 save 后再次调它渲染 Response——这里无法区分
            # 所以 create/update 方法 override 来手动控制
            return TaskCreateUpdateSerializer
        return TaskSerializer

    # ---- 重写 create / update / partial_update：输入用简化 serializer，输出用完整 serializer ----

    def create(self, request, *args, **kwargs):
        serializer = TaskCreateUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        full = TaskSerializer(serializer.instance, context={"request": request})
        return Response(full.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = TaskCreateUpdateSerializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        full = TaskSerializer(instance, context={"request": request})
        return Response(full.data)

    def partial_update(self, request, *args, **kwargs):
        kwargs["partial"] = True
        return self.update(request, *args, **kwargs)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    def perform_update(self, serializer):
        serializer.save()
