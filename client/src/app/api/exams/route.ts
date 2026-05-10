import { NextResponse } from "next/server";
import { API_URL } from "@/lib/api";

const BACKEND_URL = `${API_URL}/exams/`;

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const auth = req.headers.get("authorization");

        console.log("🔄 Proxying Create Exam Request to Backend...");

        const res = await fetch(BACKEND_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(auth ? { Authorization: auth } : {}),
            },
            body: JSON.stringify(body),
        });

        const data = await res.json();
        return NextResponse.json(data, { status: res.status });
    } catch (err) {
        console.error("❌ Proxy create exam error:", err);
        return NextResponse.json(
            { error: "Backend unreachable" },
            { status: 500 }
        );
    }
}
