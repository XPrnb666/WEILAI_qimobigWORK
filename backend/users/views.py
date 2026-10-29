import io
import os

from django.conf import settings
from django.core.files.images import ImageFile
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.http import FileResponse
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import UserProfile


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def ensure_profile(sender, instance, **kwargs):
    """每次 User 创建 / 保存时确保存在对应的 UserProfile（幂等）"""
    UserProfile.objects.get_or_create(user=instance)


# ---- 头像上传视图 ----

MAX_AVATAR_BYTES = 2 * 1024 * 1024  # 2MB
ALLOWED_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"}


class AvatarUploadView(APIView):
    """
    POST /api/users/avatar/  → multipart/form-data { "avatar": <file> }
    DELETE /api/users/avatar/ → 清除头像
    """

    permission_classes = (IsAuthenticated,)

    def post(self, request):
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        avatar = request.FILES.get("avatar")
        if not avatar:
            return Response({"detail": "缺少 avatar 文件"}, status=status.HTTP_400_BAD_REQUEST)

        # 1) 类型校验
        ct = avatar.content_type or ""
        if ct not in ALLOWED_TYPES:
            return Response(
                {"detail": f"不支持的类型: {ct or 'unknown'}。允许 jpg/png/webp/gif"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 2) 大小校验
        if avatar.size > MAX_AVATAR_BYTES:
            return Response(
                {"detail": f"文件过大（{avatar.size} 字节），上限 {MAX_AVATAR_BYTES}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 3) 删旧图（如果有），避免磁盘堆积
        old_path = None
        if profile.avatar and profile.avatar.name:
            try:
                old_path = profile.avatar.path
            except (ValueError, AttributeError):
                old_path = None
        profile.avatar.save(avatar.name, avatar, save=False)
        profile.save()
        if old_path and os.path.exists(old_path):
            try:
                os.remove(old_path)
            except OSError:
                pass

        url = request.build_absolute_uri(profile.avatar.url) if profile.avatar else ""
        return Response({"avatar": url}, status=status.HTTP_200_OK)

    def delete(self, request):
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        if profile.avatar and profile.avatar.name:
            try:
                old_path = profile.avatar.path
            except (ValueError, AttributeError):
                old_path = None
            profile.avatar = None
            profile.save()
            if old_path and os.path.exists(old_path):
                try:
                    os.remove(old_path)
                except OSError:
                    pass
        return Response({"avatar": ""}, status=status.HTTP_200_OK)
