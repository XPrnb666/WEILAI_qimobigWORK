from django.conf import settings
from django.db import models


class UserProfile(models.Model):
    """
    Django auth.User 的一对一扩展，用来存头像。
    课程作业场景用一对一 + AvatarField 最简单；不自定义 User 模型避免破坏现有迁移。
    """

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="profile",
    )
    avatar = models.ImageField(
        upload_to="avatars/%Y/%m/",
        blank=True,
        null=True,
        help_text="头像图片（jpg/png），2MB 以内",
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "用户资料"
        verbose_name_plural = "用户资料"

    def __str__(self):
        return f"Profile({self.user.username})"
