"use client"

import * as React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation" // Added useRouter
import { getDoc, doc } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
} from "firebase/auth"
import {
  Lock,
  Mail,
  Loader2,
  Eye,
  EyeOff,
  ShieldCheck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { toast } from "sonner"
import Link from "next/link"

export default function LoginPage() {
  const router = useRouter() // Initialize router
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  /* =========================
      SHARED CMS AUTH CHECK
     ========================= */
  const authorizeCMSUser = async (user: any, loginToast: any) => {
    const userDoc = await getDoc(doc(db, "adminaccount", user.uid))

    if (!userDoc.exists()) {
      throw new Error("user_not_registered")
    }

    const userData = userDoc.data()
    const role = String(userData.role || "").toLowerCase().trim()
    const status = String(userData.status || "").toLowerCase().trim()

    if (status !== "active") {
      throw new Error("account_disabled")
    }

    const validRoles = ["admin", "warehouse", "staff", "inventory", "hr"]
    if (!validRoles.includes(role)) {
      throw new Error("unauthorized_role")
    }

    // Set Session Tracking
    document.cookie = "admin_session=true; path=/; max-age=3600; SameSite=Strict"
    localStorage.setItem(
      "disruptive_admin_user",
      JSON.stringify({
        uid: user.uid,
        name: userData.fullName || userData.name || "Internal Staff",
        email: user.email,
        role,
        accessLevel: userData.accessLevel || (role === "admin" ? "full" : "staff"),
      })
    )

    toast.success(`Access Authorized: ${role.toUpperCase()}`, {
      id: loginToast,
    })

    // Use router.push for a faster, SPA-style transition
    router.push("/products/all-products")
  }

  /* =========================
      EMAIL / PASSWORD LOGIN
     ========================= */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return toast.error("Please fill in all fields")

    setIsLoading(true)
    const loginToast = toast.loading("Checking Internal Access...")

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password)
      await authorizeCMSUser(cred.user, loginToast)
    } catch (error: any) {
      handleAuthError(error, loginToast)
    } finally {
      setIsLoading(false)
    }
  }

  /* =========================
      GOOGLE LOGIN (STRICT)
     ========================= */
  const handleGoogleLogin = async () => {
    setIsLoading(true)
    const loginToast = toast.loading("Waiting for Google authentication...")

    try {
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({ prompt: "select_account" })
      const result = await signInWithPopup(auth, provider)
      await authorizeCMSUser(result.user, loginToast)
    } catch (error: any) {
      handleAuthError(error, loginToast)
    } finally {
      setIsLoading(false)
    }
  }

  /* =========================
      ERROR HANDLER HELPER
     ========================= */
  const handleAuthError = async (error: any, loginToast: string | number) => {
    await signOut(auth)
    document.cookie = "admin_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
    localStorage.removeItem("disruptive_admin_user")

    if (error?.code === "auth/popup-closed-by-user") {
      toast.dismiss(loginToast)
      return
    }

    const messages: Record<string, string> = {
      user_not_registered: "This account is not registered. Please sign up first.",
      unauthorized_role: "Access denied: Invalid role.",
      account_disabled: "Account is disabled.",
      "auth/invalid-credential": "Invalid email or password.",
    }

    toast.error(messages[error.message] || messages[error.code] || "Authentication failed.", {
      id: loginToast,
    })
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-md border-none shadow-2xl rounded-[32px] bg-white/80 backdrop-blur-xl">
        <CardHeader className="text-center pt-10">
          <div className="mx-auto w-14 h-14 bg-[#d11a2a] rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-red-100">
            <ShieldCheck className="text-white w-7 h-7" />
          </div>
          <CardTitle className="text-2xl font-black italic uppercase tracking-tighter text-slate-800">
            CMS PANEL
          </CardTitle>
          <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Internal System Access
          </CardDescription>
        </CardHeader>

        <CardContent className="px-8 pb-10 pt-4">
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">
                Staff Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-11 h-12 rounded-2xl bg-slate-50/50"
                  placeholder="name@disruptive.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-11 pr-11 h-12 rounded-2xl bg-slate-50/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#d11a2a] h-14 rounded-2xl font-black uppercase tracking-widest text-xs transition-transform active:scale-95"
            >
              {isLoading ? <Loader2 className="animate-spin" /> : "Authorize Access"}
            </Button>

            <Button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              variant="outline"
              className="w-full h-12 rounded-2xl text-xs font-bold transition-transform active:scale-95"
            >
              Continue with Google
            </Button>

            <p className="text-center text-xs text-slate-500 pt-4">
              Don’t have access yet?{" "}
              <Link
                href="/auth/register"
                className="font-black text-[#d11a2a] hover:underline"
              >
                Sign up
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}