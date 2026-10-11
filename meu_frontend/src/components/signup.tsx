"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/password-input"
import { ArrowRight, LoaderCircle } from "lucide-react"
import { authClient } from "@/lib/auth-client"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import Link from "next/link"

// Schema with validation for matching passwords
const signupSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"], // Sets the error to the confirmPassword field
})

type SignupFormValues = z.infer<typeof signupSchema>

export default function SignupForm() {
  const router = useRouter()
  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  })

  async function onSubmit(values: SignupFormValues) {
    form.clearErrors("root")
    try {
    await authClient.signUp.email({
      email: values.email,
      password: values.password,
      name: values.name,
    }, {
      onSuccess: () => {
        router.push("/dashboard")
      },
      onError: (error) => {
        const message = error.error.message || "Unable to create your account. Please try again."
        form.setError("root", { message })
        toast.error(message)
      },
    })
    } catch {
      const message = "Could not connect to Meu. Please try again."
      form.setError("root", { message })
      toast.error(message)
    }
  }

  const isPending = form.formState.isSubmitting;

  return (
    <section aria-labelledby="signup-title">
      <header className="auth-form-heading">
        <h1 id="signup-title">Create your account</h1>
        <p>Build your own trading workspace.</p>
      </header>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="auth-form-fields auth-signup-fields" aria-busy={isPending}>
            
            {/* Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Your full name" autoComplete="name" disabled={isPending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Email */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="you@example.com" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} disabled={isPending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Password */}
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <PasswordInput {...field} autoComplete="new-password" placeholder="At least 8 characters" disabled={isPending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Confirm Password */}
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm password</FormLabel>
                  <FormControl>
                    <PasswordInput {...field} autoComplete="new-password" placeholder="Repeat your password" disabled={isPending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.formState.errors.root ? (
              <p role="alert" className="text-sm text-destructive">{form.formState.errors.root.message}</p>
            ) : null}
            <Button
              type="submit"
              className="auth-submit w-full"
              disabled={isPending}
            >
              {isPending ? <LoaderCircle className="auth-submit-spinner animate-spin" aria-hidden="true" /> : null}
              {isPending ? "Creating account…" : "Create account"}
              {!isPending ? <ArrowRight className="auth-submit-arrow" aria-hidden="true" /> : null}
            </Button>
            <div className="auth-form-switch">
              <p className="text-sm">
              Already have an account?
              <Link href="/login" className="auth-inline-link"> Sign in</Link>
              </p>
            </div>
          </form>
        </Form>
    </section>
  )
}
