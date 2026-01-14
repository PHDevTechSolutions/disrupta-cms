"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion, useReducedMotion } from "framer-motion";
import { Chrome } from "lucide-react";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { auth, db } from "@/lib/firebase";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

const socialProviders = [{ name: "Google", icon: Chrome }];

export default function RegisterForm() {
  const shouldReduceMotion = useReducedMotion();
  const router = useRouter();

  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleGoogleSignUp = async () => {
    if (!acceptedTerms) return alert("You must accept the terms first.");
    try {
      setLoading(true);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });

      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        // Save new user to Firestore
        await setDoc(ref, {
          uid: user.uid,
          firstName: user.displayName?.split(" ")[0] || "",
          lastName: user.displayName?.split(" ")[1] || "",
          email: user.email,
          provider: "google",
          password: null,
          createdAt: serverTimestamp(),
        });
      }

      router.push("/auth/login");
    } catch (err: any) {
      alert(err.message || "Google sign-up failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!acceptedTerms) return alert("You must accept the terms first.");

    const formData = new FormData(event.currentTarget);
    const firstName = formData.get("firstName") as string;
    const lastName = formData.get("lastName") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (password !== confirmPassword) return alert("Passwords do not match.");

    try {
      setLoading(true);
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const user = cred.user;

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        firstName,
        lastName,
        email,
        provider: "password",
        password,
        createdAt: serverTimestamp(),
      });

      router.push("/auth/login");
    } catch (err: any) {
      alert(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: shouldReduceMotion ? "linear" : [0.16, 1, 0.3, 1] }}
      className="group w-full rounded-3xl overflow-hidden border border-border/60 bg-card/85 p-8 backdrop-blur-xl sm:p-12 relative"
    >
      {/* HEADER */}
      <div className="mb-8 text-center">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-border/60 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.28em] text-muted-foreground">
          Sign Up
        </div>
        <h1 className="mt-3 text-2xl font-semibold text-foreground sm:text-3xl">
          Create your account
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign up with email or Google.
        </p>
      </div>

      {/* EMAIL FORM */}
      <form className="grid gap-6 sm:grid-cols-2" onSubmit={handleSubmit}>
        <div className="space-y-2 sm:col-span-1">
          <Label htmlFor="first-name">First name</Label>
          <Input
            id="first-name"
            name="firstName"
            placeholder="Alex"
            autoComplete="given-name"
            required
            className="h-11 rounded-2xl border-border/60 bg-background/60 px-4"
          />
        </div>
        <div className="space-y-2 sm:col-span-1">
          <Label htmlFor="last-name">Last name</Label>
          <Input
            id="last-name"
            name="lastName"
            placeholder="Johnson"
            autoComplete="family-name"
            required
            className="h-11 rounded-2xl border-border/60 bg-background/60 px-4"
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="sign-up-email">Email address</Label>
          <Input
            id="sign-up-email"
            type="email"
            name="email"
            placeholder="you@example.com"
            autoComplete="email"
            required
            className="h-11 rounded-2xl border-border/60 bg-background/60 px-4"
          />
        </div>
        <div className="space-y-2 sm:col-span-1">
          <Label htmlFor="sign-up-password">Password</Label>
          <Input
            id="sign-up-password"
            type="password"
            name="password"
            placeholder="Create a password"
            autoComplete="new-password"
            required
            className="h-11 rounded-2xl border-border/60 bg-background/60 px-4"
          />
        </div>
        <div className="space-y-2 sm:col-span-1">
          <Label htmlFor="sign-up-confirm-password">Confirm password</Label>
          <Input
            id="sign-up-confirm-password"
            type="password"
            name="confirmPassword"
            placeholder="Repeat password"
            autoComplete="new-password"
            required
            className="h-11 rounded-2xl border-border/60 bg-background/60 px-4"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="flex items-start gap-3 text-sm text-muted-foreground">
            <Checkbox
              id="sign-up-terms"
              checked={acceptedTerms}
              onCheckedChange={(checked) => setAcceptedTerms(Boolean(checked))}
            />
            <span>
              I agree to the{" "}
              <button type="button" className="text-primary underline-offset-4 hover:underline">
                terms of service
              </button>{" "}
              and{" "}
              <button type="button" className="text-primary underline-offset-4 hover:underline">
                privacy policy
              </button>
              .
            </span>
          </label>
        </div>

        <div className="sm:col-span-2">
          <Button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-primary px-6 py-3 text-primary-foreground shadow-[0_20px_60px_-30px_rgba(79,70,229,0.75)] transition-transform duration-300 hover:-translate-y-1"
          >
            {loading ? "Creating account..." : "Create account"}
          </Button>
        </div>
      </form>

      {/* OR DIVIDER */}
      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-border/70" />
        <span className="text-xs uppercase tracking-[0.34em] text-muted-foreground">
          or
        </span>
        <div className="h-px flex-1 bg-border/70" />
      </div>

      {/* GOOGLE BUTTON */}
      <div className="mb-8 flex flex-col gap-4">
        {socialProviders.map((provider) => (
          <Button
            key={provider.name}
            variant="outline"
            onClick={handleGoogleSignUp}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-full border-border/60 bg-card/70 text-sm text-foreground transition-transform duration-300 hover:-translate-y-1 hover:text-primary"
          >
            <provider.icon className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">Continue With Google</span>
          </Button>
        ))}
      </div>
    </motion.div>
  );
}
