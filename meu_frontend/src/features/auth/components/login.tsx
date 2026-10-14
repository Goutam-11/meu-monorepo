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
import { PasswordInput } from "@/features/auth/components/password-input"
import { ArrowRight, LoaderCircle } from "lucide-react"
import { authClient } from "@/lib/auth/client"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import Link from "next/link"

// Define validation schema
const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(8, { message: "Password must be at least 8 characters." }),
})

type FormValues = z.infer<typeof formSchema>

export default function LoginForm() {
  const router = useRouter()
  // Initialize form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  async function onSubmit(values: FormValues) {
    form.clearErrors("root")
    try {
     await authClient.signIn.email({
       email: values.email,
       password: values.password,
     },{
       onSuccess: () => {
         router.push("/dashboard")
       },
       onError: (error) => {
         const message = error.error.message || "Unable to sign in. Please try again."
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
    <section aria-labelledby="login-title">
      <header className="auth-form-heading">
        <h1 id="login-title">Welcome back</h1>
        <p>Sign in to your trading workspace.</p>
      </header>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="auth-form-fields" aria-busy={isPending}>
            {/* Email Field */}
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

            {/* Password Field */}
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <PasswordInput {...field} autoComplete="current-password" placeholder="Enter your password" disabled={isPending} />
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
              {isPending ? "Signing in…" : "Sign in"}
              {!isPending ? <ArrowRight className="auth-submit-arrow" aria-hidden="true" /> : null}
            </Button>
            <div className="auth-form-switch">
              <p className="text-sm">
              New to Meu?{" "}
              <Link href="/signup" className="auth-inline-link">
                Create an account
              </Link>
              </p>
            </div>
          </form>
        </Form>
    </section>
  )
}
