import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

const MIN_PASSWORD_LENGTH = 6;
const MAX_USER_LOOKUP_PAGES = 20;

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function findUserByEmail(admin, email) {
  for (let page = 1; page <= MAX_USER_LOOKUP_PAGES; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 1000
    });

    if (error) {
      throw error;
    }

    const user = data?.users?.find((candidate) => {
      return normalizeEmail(candidate.email) === email;
    });

    if (user || !data?.users?.length || data.users.length < 1000) {
      return user || null;
    }
  }

  return null;
}

export async function POST(request) {
  try {
    const { email: rawEmail, password } = await request.json();
    const email = normalizeEmail(rawEmail);

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (!error) {
      return NextResponse.json({ userId: data.user.id });
    }

    const message = error.message || "";
    const alreadyExists = /already.*registered|already.*exists|user.*exists/i.test(message);

    if (!alreadyExists) {
      throw error;
    }

    const existingUser = await findUserByEmail(admin, email);

    if (!existingUser) {
      return NextResponse.json(
        { error: "This email is already registered. Please log in instead." },
        { status: 409 }
      );
    }

    if (existingUser.email_confirmed_at) {
      return NextResponse.json(
        { error: "This email is already registered. Please log in instead." },
        { status: 409 }
      );
    }

    const { error: updateError } = await admin.auth.admin.updateUserById(existingUser.id, {
      email_confirm: true
    });

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ existingUserConfirmed: true, userId: existingUser.id });
  } catch (error) {
    console.error("Signup failed:", error);

    return NextResponse.json(
      { error: error.message || "Unable to create account." },
      { status: 500 }
    );
  }
}
