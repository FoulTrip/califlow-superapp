import axios from "axios";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

export async function POST(req: NextRequest) {
    try {
        // Get the session to access the access token
        const session = await auth();

        if (!(session as any)?.accessToken) {
            console.log("No session or access token found");
            return NextResponse.json({ message: "No active session" });
        }

        console.log("Logging out with access token");

        // Call backend logout endpoint with Bearer token
        await axios.post(
            `${process.env.NEXT_PUBLIC_URL_GATEWAY}/auth/logout`,
            {},
            {
                headers: {
                    'Authorization': `Bearer ${(session as any).accessToken}`
                }
            }
        );

        console.log("Backend logout successful");

        return NextResponse.json({
            message: "Logged out successfully",
            success: true
        });
    } catch (error) {
        console.error("Logout error:", error);
        // Even if backend logout fails, we proceed with client-side logout
        return NextResponse.json({ message: "Logged out from client" });
    }
}