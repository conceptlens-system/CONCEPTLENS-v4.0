import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
    // `withAuth` augments your `Request` with the user's token.
    function middleware(req) {
        const { pathname } = req.nextUrl;
        const role = req.nextauth.token?.role;

        // Protect Admin Routes strictly
        if (pathname.startsWith("/admin") && role !== "admin") {
            return NextResponse.redirect(new URL("/", req.url));
        }

        // Protect Professor Routes strictly
        if (pathname.startsWith("/professor") && role !== "professor") {
            return NextResponse.redirect(new URL("/", req.url));
        }

        // Protect Student Routes strictly
        if (pathname.startsWith("/student") && role !== "student") {
            return NextResponse.redirect(new URL("/", req.url));
        }

        return NextResponse.next();
    },
    {
        callbacks: {
            // This is required to force `withAuth` to trigger the `middleware` function
            // If returning `true`, the middleware continues. If `false`, it redirects to login.
            authorized: ({ token }) => !!token,
        },
    }
);

export const config = {
    // Define which routes this middleware should apply to
    matcher: [
        "/admin/:path*",
        "/professor/:path*",
        "/student/:path*",
    ]
};
