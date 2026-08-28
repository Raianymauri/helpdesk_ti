"""Comando idempotente para criar ou atualizar uma conta.

Uso:
    python -m app.provision_user --name "Maria Silva" --email maria@example.test \
        --role REQUESTER --password "<senha>"
"""

import argparse
import sys

from pydantic import TypeAdapter, ValidationError
from sqlalchemy import select

from app.auth.models import User, UserRole
from app.auth.schemas import EmailAddress
from app.auth.service import hash_password, normalize_email
from app.config import load_settings
from app.database import (
    assert_schema_is_migrated,
    create_database_engine,
    create_session_factory,
)


def _parse_arguments(argv: list[str] | None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Cria ou atualiza um usuário do helpdesk.")
    parser.add_argument("--name", required=True, help="Nome de exibição, 2 a 100 caracteres.")
    parser.add_argument("--email", required=True, help="E-mail único do usuário.")
    parser.add_argument("--role", required=True, choices=[role.value for role in UserRole])
    parser.add_argument("--password", required=True, help="Senha em texto, com 8+ caracteres.")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    arguments = _parse_arguments(argv)
    display_name = arguments.name.strip()
    try:
        email = normalize_email(TypeAdapter(EmailAddress).validate_python(arguments.email))
    except ValidationError:
        print("E-mail inválido.", file=sys.stderr)
        return 2
    if not 2 <= len(display_name) <= 100:
        print("Nome deve ter entre 2 e 100 caracteres.", file=sys.stderr)
        return 2
    if len(arguments.password) < 8:
        print("Senha deve ter ao menos 8 caracteres.", file=sys.stderr)
        return 2

    settings = load_settings()
    engine = create_database_engine(settings.database_path)
    assert_schema_is_migrated(engine)
    with create_session_factory(engine)() as db_session:
        user = db_session.scalars(select(User).where(User.email_normalized == email)).first()
        if user is None:
            user = User(email_normalized=email)
            db_session.add(user)
        user.display_name = display_name
        user.role = arguments.role
        user.password_hash = hash_password(arguments.password)
        user.is_active = True
        db_session.commit()
        print(f"Usuário {email} pronto com papel {arguments.role}.")
    engine.dispose()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
