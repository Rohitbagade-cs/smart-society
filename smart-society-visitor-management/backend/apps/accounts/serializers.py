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


class MyProfileUpdateSerializer(serializers.Serializer):
    """Self-service profile update (PATCH /api/auth/me/).

    Whitelisted fields only — username, role, and staff flags can never be
    changed here, so a resident cannot escalate their own privileges.
    """

    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    flat_no = serializers.CharField(max_length=20, required=False)
    wing = serializers.CharField(max_length=20, required=False, allow_blank=True)
    floor = serializers.IntegerField(required=False, min_value=0, max_value=200)
    family_members = serializers.IntegerField(required=False, min_value=1, max_value=30)
    shift = serializers.ChoiceField(
        choices=["morning", "evening", "night"], required=False
    )
    gate = serializers.CharField(max_length=60, required=False, allow_blank=True)

    def update(self, instance, validated_data):
        for field in ("first_name", "last_name", "email"):
            if field in validated_data:
                setattr(instance, field, validated_data[field])
        if "phone" in validated_data and hasattr(instance, "phone"):
            instance.phone = validated_data["phone"]
        instance.save()
        resident = getattr(instance, "resident_profile", None)
        if resident is not None:
            for field in ("flat_no", "wing", "floor", "phone", "family_members"):
                if field in validated_data:
                    setattr(resident, field, validated_data[field])
            resident.save()
        guard = getattr(instance, "guard_profile", None)
        if guard is not None:
            for field in ("shift", "gate", "phone"):
                if field in validated_data:
                    setattr(guard, field, validated_data[field])
            guard.save()
        return instance


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
