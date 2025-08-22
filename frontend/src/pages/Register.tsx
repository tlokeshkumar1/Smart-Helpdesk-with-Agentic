import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import toast from 'react-hot-toast';

const registerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
  role: z.enum(['admin', 'agent', 'user'], {
    message: 'Please select your role',
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegisterForm = z.infer<typeof registerSchema>;

export const Register: React.FC = () => {
  const { user, register: registerUser, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  if (user) {
    return <Navigate to="/tickets" />;
  }

  const onSubmit = async (data: RegisterForm) => {
    try {
      await registerUser(data.email, data.password, data.name, data.role);
      toast.success('Account created successfully!');
      navigate('/tickets');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error && 'response' in error && 
        typeof error.response === 'object' && error.response !== null &&
        'data' in error.response && typeof error.response.data === 'object' &&
        error.response.data !== null && 'message' in error.response.data
        ? String(error.response.data.message)
        : 'Registration failed';
      toast.error(errorMessage);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Smart Helpdesk</h1>
          <p className="mt-2 text-gray-600">Create your account</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign Up</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                {...register('name')}
                type="text"
                label="Name"
                placeholder="Enter your name"
                error={errors.name?.message}
              />

              <Select
                {...register('role')}
                label="Role"
                placeholder="Select your role"
                options={[
                  { value: 'user', label: 'User' },
                  { value: 'agent', label: 'Agent' },
                  { value: 'admin', label: 'Admin' },
                ]}
                error={errors.role?.message}
              />

              <Input
                {...register('email')}
                type="email"
                label="Email"
                placeholder="Enter your email"
                error={errors.email?.message}
              />

              <Input
                {...register('password')}
                type="password"
                label="Password"
                placeholder="Enter your password"
                error={errors.password?.message}
              />

              <Input
                {...register('confirmPassword')}
                type="password"
                label="Confirm Password"
                placeholder="Confirm your password"
                error={errors.confirmPassword?.message}
              />

              <Button
                type="submit"
                className="w-full"
                isLoading={isLoading}
              >
                Sign Up
              </Button>
            </form>

            <div className="mt-6 text-center">
              <span className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link
                  to="/login"
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  Sign in
                </Link>
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};