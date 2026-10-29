from django.conf import settings
from django.db import models


class Task(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="tasks",
        help_text="拥有此任务的用户",
    )
    title = models.CharField(max_length=200, help_text="任务标题")
    category = models.CharField(
        max_length=100, blank=True, default="通用", help_text="任务分类（工作/学习/生活/个人）"
    )
    due_date = models.DateField(null=True, blank=True, help_text="截止日期")
    completed = models.BooleanField(default=False, help_text="是否已完成")
    created_at = models.DateTimeField(auto_now_add=True, help_text="创建时间")
    updated_at = models.DateTimeField(auto_now=True, help_text="更新时间")

    class Meta:
        ordering = ["completed", "due_date", "-created_at"]
        verbose_name = "任务"
        verbose_name_plural = "任务"

    def __str__(self):
        return f"#{self.id} {self.title} ({self.owner.username})"
