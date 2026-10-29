"""
幂等 admin 用户初始化脚本。

用法：
    cd backend
    python manage.py shell < init_admin.py

设计原则（经验 179090 教训）：
    - get_or_create：已存在则更新密码和权限，不存在才创建
    - 不交互式输入；密码硬编码 admin123（课程作业，够用）
    - 每次迁移后可重复执行，不会报错也不会改坏数据
"""
from django.contrib.auth import get_user_model

User = get_user_model()

username = "admin"
password = "admin123"

user, created = User.objects.get_or_create(
    username=username,
    defaults={"email": "admin@quicktask.local"},
)

if created:
    user.set_password(password)
    user.is_staff = True
    user.is_superuser = True
    user.save()
    print(f"[init_admin] Created superuser: {username} / {password}")
else:
    updated = False
    if not user.check_password(password):
        user.set_password(password)
        updated = True
    if not (user.is_staff and user.is_superuser):
        user.is_staff = True
        user.is_superuser = True
        updated = True
    if updated:
        user.save()
        print(f"[init_admin] Updated user: {username} (password reset + staff/superuser enabled)")
    else:
        print(f"[init_admin] User {username} already exists and is up to date.")
