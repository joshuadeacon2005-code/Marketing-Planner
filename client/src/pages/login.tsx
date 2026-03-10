import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { Flower2, Loader2, Eye, EyeOff, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/lib/auth-store";
import { apiRequest } from "@/lib/queryClient";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  const { login } = useAuthStore();

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginFormData) => {
      const response = await apiRequest("POST", "/api/auth/login", data);
      return response;
    },
    onSuccess: (data) => {
      login(data.user, data.token);
      toast({
        title: "Welcome back!",
        description: `Logged in as ${data.user.name}`,
      });
      setLocation("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message || "Invalid email or password",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: LoginFormData) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-orange-light via-white to-brand-blue-light p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-orange mb-4 shadow-lg">
            <Flower2 className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 font-serif">Bloom & Grow</h1>
          <p className="text-sm text-gray-600">Marketing Planner</p>
        </div>

        <Card className="border-0 shadow-xl">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl font-semibold">Welcome back</CardTitle>
            <CardDescription>Sign in to your account to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="you@company.com"
                          type="email"
                          autoComplete="email"
                          className="h-11 focus:border-brand-orange focus:ring-brand-orange/20"
                          data-testid="input-email"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            placeholder="Enter your password"
                            type={showPassword ? "text" : "password"}
                            autoComplete="current-password"
                            className="h-11 pr-10 focus:border-brand-orange focus:ring-brand-orange/20"
                            data-testid="input-password"
                            {...field}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            data-testid="button-toggle-password"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full h-11 bg-brand-orange hover:bg-brand-orange-dark text-white font-medium"
                  disabled={loginMutation.isPending}
                  data-testid="button-login"
                >
                  {loginMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign in"
                  )}
                </Button>
              </form>
            </Form>
            
            <div className="mt-6 pt-6 border-t border-gray-100 text-center space-y-3">
              <p className="text-xs text-gray-500">
                Demo: admin@bloomandgrow.com / Admin123!
              </p>
              <Link
                href="/user-guide"
                className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-brand-orange transition-colors"
              >
                <BookOpen className="w-3.5 h-3.5" />
                View User Guide
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
