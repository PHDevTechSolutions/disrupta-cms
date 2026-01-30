"use client";

import * as React from "react";
import { useState } from "react";
import { auth, db } from "@/lib/firebase";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { UserPlus, Mail, Lock, User, Loader2, Briefcase } from "lucide-react"; // Added Briefcase
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"; // Added Select imports
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { toast } from "sonner";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<string>(""); // Changed to empty string for Select
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();

  /* =========================
      AUTH LOGIC (Shared)
     ========================= */
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password || !fullName || !role) {
      toast.error("Please fill in all fields");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);
    const regToast = toast.loading("Creating account...");

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const user = cred.user;

      await updateProfile(user, { displayName: fullName });

      const ref = doc(db, "adminaccount", user.uid);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        toast.error("Account already exists", { id: regToast });
        router.push("/auth/login");
        return;
      }

      await setDoc(ref, {
        uid: user.uid,
        email,
        fullName,
        role,
        accessLevel: role === "admin" ? "full" : "staff",
        status: "active",
        website: "disruptivesolutionsinc",
        provider: "password",
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
      });

      toast.success("Account authorized!", { id: regToast });
      router.push("/auth/login");
    } catch (err: any) {
      toast.error(err.message || "Registration failed", { id: regToast });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    if (!role) {
      toast.error("Please select an account role first");
      return;
    }

    setIsLoading(true);
    const googleToast = toast.loading("Waiting for Google authentication...");

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const ref = doc(db, "adminaccount", user.uid);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        toast.info("Account already exists. Please sign in.", {
          id: googleToast,
        });
        router.push("/auth/login");
        return;
      }

      await setDoc(ref, {
        uid: user.uid,
        email: user.email,
        fullName: user.displayName || "",
        role,
        accessLevel: role === "admin" ? "full" : "staff",
        status: "active",
        provider: "google",
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
      });

      toast.success("Google account authorized!", { id: googleToast });
      router.push("/auth/login");
    } catch (err: any) {
      if (err?.code !== "auth/popup-closed-by-user") {
        toast.error(err.message || "Google sign up failed", {
          id: googleToast,
        });
      } else {
        toast.dismiss(googleToast);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 px-4 py-10">
      <Card className="w-full max-w-md border-none shadow-2xl rounded-[32px] bg-white/80 backdrop-blur-xl">
        <CardHeader className="pt-10 pb-6 text-center">
          <div className="mx-auto w-12 h-12 bg-[#d11a2a] rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-red-100">
            <UserPlus className="text-white w-6 h-6" />
          </div>
          <CardTitle className="text-2xl font-black uppercase italic tracking-tighter text-slate-800">
            Internal Access
          </CardTitle>
          <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Provisioning Authorized Staff & Admins
          </CardDescription>

          {/* THE NEW TIP */}
          <p className="text-[9px] font-medium text-slate-400/80 italic mt-1 uppercase tracking-tight">
            Tip: Select role before using Google Register
          </p>
        </CardHeader>

        <CardContent className="pb-10 px-8">
          <form onSubmit={handleRegister} className="space-y-4">
            {/* FULL NAME */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">
                Full Name
              </Label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
                <Input
                  className="pl-11 h-12 rounded-2xl bg-slate-50/50"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* UPDATED ROLE SELECTOR */}
            {/* UPDATED ROLE SELECTOR (FULL WIDTH) */}
            <div className="space-y-1.5 w-full">
              <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">
                Account Role
              </Label>
              <div className="relative w-full">
                <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10 pointer-events-none" />
                <Select onValueChange={(value) => setRole(value)} value={role}>
                  <SelectTrigger className="w-full pl-11 h-12 rounded-2xl bg-slate-50/50 border-slate-200 focus:ring-[#d11a2a]">
                    <SelectValue placeholder="Select Role" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="admin">Administrator</SelectItem>
                    <SelectItem value="warehouse">Warehouse Staff</SelectItem>
                    <SelectItem value="seo">SEO Specialist</SelectItem>
                    <SelectItem value="hr">Human Resources</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* EMAIL */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
                <Input
                  type="email"
                  className="pl-11 h-12 rounded-2xl bg-slate-50/50"
                  placeholder="name@disruptive.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* PASSWORD */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
                <Input
                  type="password"
                  className="pl-11 h-12 rounded-2xl bg-slate-50/50"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="pt-2 space-y-3">
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#d11a2a] h-14 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-red-100 transition-transform active:scale-[0.98]"
              >
                {isLoading ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  "Complete Registration"
                )}
              </Button>

              <Button
                type="button"
                onClick={handleGoogleSignUp}
                disabled={isLoading || !role}
                variant="outline"
                className="w-full h-12 rounded-2xl text-xs font-bold border-slate-200 transition-transform active:scale-[0.98]"
              >
                Sign Up with Google
              </Button>
            </div>

            <p className="text-center text-xs text-slate-500 pt-2">
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => router.push("/auth/login")}
                className="font-black text-[#d11a2a] hover:underline"
              >
                Sign in
              </button>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
