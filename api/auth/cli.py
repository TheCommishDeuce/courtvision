"""CLI for managing CourtVision API users and keys."""
from __future__ import annotations

import click

from api.auth.keys import (
    create_api_key_for_user,
    create_user,
    get_user_by_email,
    list_api_keys_for_user,
    revoke_api_key,
    update_user_tier,
)


@click.group()
def cli() -> None:
    """Manage API auth users and keys."""


@cli.command("create-user")
@click.option("--email", required=True, help="User email address.")
@click.option("--name", required=True, help="Display name.")
@click.option("--tier", default="free", show_default=True, help="Access tier.")
def create_user_command(email: str, name: str, tier: str) -> None:
    """Create a user, or return the existing user for the email."""
    user = create_user(email=email, name=name, tier=tier)
    click.echo(f"id={user['id']}")
    click.echo(f"email={user['email']}")
    click.echo(f"tier={user['tier']}")


@cli.command("create-key")
@click.option("--email", required=True, help="User email address.")
@click.option("--name", required=True, help="Key display name.")
def create_key_command(email: str, name: str) -> None:
    """Create an API key for an existing user."""
    user = get_user_by_email(email)
    if user is None:
        raise click.ClickException(f"No user found for email: {email}")
    key = create_api_key_for_user(user["id"], name=name)
    click.echo(f"id={key['id']}")
    click.echo(f"prefix={key['key_prefix']}")
    click.echo(f"key={key['key']}")


@cli.command("list-keys")
@click.option("--email", required=True, help="User email address.")
def list_keys_command(email: str) -> None:
    """List API keys for a user."""
    user = get_user_by_email(email)
    if user is None:
        raise click.ClickException(f"No user found for email: {email}")
    for key in list_api_keys_for_user(user["id"]):
        active = "active" if key["is_active"] else "revoked"
        last_used = key["last_used_at"] or "never"
        click.echo(
            f"{key['id']} {key['key_prefix']} {active} "
            f"name={key['name']} last_used={last_used}"
        )


@cli.command("set-tier")
@click.option("--email", required=True, help="User email address.")
@click.option(
    "--tier",
    required=True,
    type=click.Choice(["free", "research", "dev", "starter", "pro"]),
    help="Access tier to assign. starter/pro are legacy aliases.",
)
def set_tier_command(email: str, tier: str) -> None:
    """Set a user's tier for admin access-control workflows."""
    user = get_user_by_email(email)
    if user is None:
        raise click.ClickException(f"No user found for email: {email}")
    updated = update_user_tier(user["id"], tier=tier)
    if updated is None:
        raise click.ClickException(f"Could not update tier for email: {email}")
    click.echo(f"id={updated['id']}")
    click.echo(f"email={updated['email']}")
    click.echo(f"tier={updated['tier']}")


@cli.command("revoke-key")
@click.option("--key-id", required=True, help="API key UUID.")
def revoke_key_command(key_id: str) -> None:
    """Revoke an API key."""
    if not revoke_api_key(key_id):
        raise click.ClickException(f"No active key found for id: {key_id}")
    click.echo(f"revoked={key_id}")


if __name__ == "__main__":
    cli()
