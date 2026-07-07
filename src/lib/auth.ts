import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

// Customize PrismaAdapter to map 'image' to 'avatarUrl'
const customAdapter = {
    ...PrismaAdapter(prisma),
    createUser: async (data: any) => {
        const { image, ...rest } = data
        return prisma.user.create({
            data: {
                ...rest,
                avatarUrl: image, // Map image to avatarUrl
            },
        })
    },
    updateUser: async ({ id, ...data }: any) => {
        const { image, ...rest } = data
        return prisma.user.update({
            where: { id },
            data: {
                ...rest,
                ...(image && { avatarUrl: image }), // Map image to avatarUrl if present
            },
        })
    },
}

export const { handlers, auth, signIn, signOut } = NextAuth({
    adapter: customAdapter,
    session: {
        strategy: "jwt",
    },
    pages: {
        signIn: "/login",
        error: "/login",
    },
    providers: [
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            allowDangerousEmailAccountLinking: true,
        }),
        Credentials({
            name: "credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    return null
                }

                const user = await prisma.user.findUnique({
                    where: { email: credentials.email as string },
                })

                if (!user || !user.passwordHash) {
                    return null
                }

                const isValid = await bcrypt.compare(
                    credentials.password as string,
                    user.passwordHash
                )

                if (!isValid) {
                    return null
                }

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                }
            },
        }),
    ],
    callbacks: {
        async signIn({ user, account }) {
            // For OAuth providers, ensure user has a role
            if (account?.provider === "google") {
                const existingUser = await prisma.user.findUnique({
                    where: { email: user.email! },
                })

                // If user doesn't exist yet, they'll be created by the adapter
                // with default role CUSTOMER (set in Prisma schema)
                // If user exists, we just verify they can sign in
                if (existingUser) {
                    return true
                }
            }
            return true
        },
        async jwt({ token, user, trigger, session, account }) {
            if (user) {
                token.id = user.id
                token.role = (user as { role: string }).role
            }

            // For OAuth sign-in, fetch role from database if not in user object
            if (account?.provider === "google" && !token.role) {
                const dbUser = await prisma.user.findUnique({
                    where: { email: token.email! },
                    select: { role: true, id: true },
                })
                if (dbUser) {
                    token.id = dbUser.id
                    token.role = dbUser.role
                }
            }

            if (trigger === "update" && session?.role) {
                token.role = session.role
            }
            return token
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string
                session.user.role = token.role as "ADMIN" | "PROVIDER" | "CUSTOMER"
            }
            return session
        },
    },
})
