import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import axios from "axios";

export const { handlers, signIn, signOut, auth } = NextAuth({
    trustHost: true,
    basePath: "/api/auth",
    providers: [
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
        Credentials({
            name: "credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials: any) {
                console.log("Authorize called with credentials:", {
                    email: credentials?.email,
                    passwordLength: credentials?.password?.length,
                    password: credentials?.password,
                });

                try {

                    const apiUrl = `${process.env.NEXT_PUBLIC_URL_GATEWAY}/auth/login`;

                    console.log("Calling API:", apiUrl);

                    const response = await axios.post(apiUrl, {
                        email: credentials?.email,
                        password: credentials?.password,
                    }, {
                        headers: {
                            'Content-Type': 'application/json',
                            'user-agent': 'TattooAI-Web-Client'
                        }
                    });

                    console.log("API response status:", response.status);

                    const data = response.data;

                    console.log("API response data:", data);

                    if (data.user) {
                        console.log("User found, returning user object");

                        return {
                            id: data.user.id,
                            email: data.user.email,
                            name: data.user.name,
                            role: data.user.role,
                            userType: data.user.userType,
                            accessToken: data.accessToken,
                            refreshToken: data.refreshToken,
                        };

                    } else {
                        console.log("No user in response data");
                    }

                    return null;

                } catch (error) {
                    console.error("Auth error details:", error);

                    if (axios.isAxiosError(error)) {
                        console.error("Axios error response:", error.response?.data);
                        console.error("Axios error status:", error.response?.status);
                    }

                    return null;
                }
            }
        })
    ],
    pages: {
        signIn: "/auth",
    },
    callbacks: {
        async redirect({ url, baseUrl }) {
            console.log('Redirect callback - URL:', url, 'BaseURL:', baseUrl);

            // Después de login exitoso, ir a home
            if (url.includes('/api/auth/callback') ||
                url.includes('/api/auth/signin') ||
                url === baseUrl + '/auth' ||
                url === '/auth') {
                const homeUrl = `${baseUrl}/`;
                console.log('Redirecting to home:', homeUrl);
                return homeUrl;
            }

            // Permitir URLs relativas
            if (url.startsWith("/")) return `${baseUrl}${url}`;

            // Permitir URLs del mismo origen
            if (url.startsWith(baseUrl)) return url;

            // Por defecto, ir a home
            return `${baseUrl}/`;
        },
        async session({ session, token }) {
            console.log("Session callback called with token:", !!token);
            if (token && session.user) {
                session.user.id = token.sub as string;
                session.user.email = token.email as string;
                session.user.name = token.name as string;
                session.user.role = token.role as string;
                session.accessToken = token.accessToken;
                session.refreshToken = token.refreshToken;
                session.userType = token.userType;
            }
            return session;
        },
        async jwt({ token, user, trigger }) {
            console.log("JWT callback - trigger:", trigger);
            if (user) {
                token.email = user.email;
                token.name = user.name;
                token.role = user.role;
                token.userType = user.userType;
                token.accessToken = user.accessToken;
                token.refreshToken = user.refreshToken;
            }
            return token;
        }
    }
});