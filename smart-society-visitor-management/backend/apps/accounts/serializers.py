"""
Serializers for accounts: users, profiles, registration and JWT login.
"""

from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from apps.accounts.models import ResidentProfile, SecurityGuardProfile, User


class ResidentUserSerializer(serializers.ModelSerializer):
    """Minimal nested user for profile dropdowns (guard's resident select)."""

    class Meta:
        model = User
        fields = ["id", "username", "first_name", "last_name"]


class ResidentProfileSerializer(serializers.ModelSerializer):
    user = ResidentUserSerializer(read_only=True)
    # Write path for user assignment (read responses use the nested `user`).
    user_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), source="user", write_only=True, required=False
    )

    class Meta:
        model = ResidentProfile
        fields = [
            "id", "user", "user_id",
            "flat_no", "wing", "floor", "phone", "family_members",
        ]


class SecurityGuardProfileSerializer(serializers.ModelSerializer):
    user = ResidentUserSerializer(read_only=True)
    user_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), source="user", write_only=True, required=False
    )

    class Meta:
        model = SecurityGuardProfile
        fields = ["id", "user", "user_id", "shift", "gate", "phone"]


class UserSerializer(serializers.ModelSerializer):
    """Full user serializer. `password` is write-only and always hashed."""

    password = serializers.CharField(
        write_only=True, required=False, validators=[validate_password]
    )
    resident_profile = ResidentProfileSerializer(read_only=True)
    guard_profile = SecurityGuardProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "role",
            "phone",
            "is_active",
            "is_staff",
            "date_joined",
            "password",
            "resident_profile",
            "guard_profile",
        ]
        read_only_fields = ["id", "date_joined"]

    def create(self, validated_data):
        password = validated_data.pop("password", None)
        user = User(**validated_data)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)  # secure hashing via Django's PBKDF2
        instance.save()
        return instance


class UserRegisterSerializer(serializers.ModelSerializer):
    """
    Admin-only registration serializer. Admins create users with an explicit
    role; self-registration for residents/guards is intentionally not exposed.
    """

    password = serializers.CharField(write_only=True, validators=[validate_password])

    class Meta:
        model = User
        fields = ["username", "email", "password", "first_name", "last_name", "role", "phone"]

    def validate_role(self, value):
        if value not in dict(User.Role.choices):
            raise serializers.ValidationError("Invalid role.")
        return value

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Login serializer: embeds role and identity claims in the access token."""

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"] = user.role
        token["username"] = user.username
        token["email"] = user.email or ""
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        user = self.user
        data["user"] = {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role,
        }
        return data
