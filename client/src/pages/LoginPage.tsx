import React from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Form, Button, Alert, Card, Container, Row, Col } from 'react-bootstrap';
import { useAuth } from '../hooks/useAuth';
import { LoadingButton } from '../components/common/LoadingComponents';
import { loginSchema } from '../utils/validation.utils';
import { LoginFormData } from '../types/common.types';

const LoginPage: React.FC = () => {
  const { login, loading, error } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<LoginFormData>({
    resolver: yupResolver(loginSchema)
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login({
        email: data.email,
        password: data.password
      });
    } catch (err) {
      // Error is handled by the useAuth hook
      console.error('Login failed:', err);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}/api/users/google`;
  };

  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center min-vh-100">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Checking authentication...</p>
        </div>
      </Container>
    );
  }

  return (
    <Container className="min-vh-100 d-flex align-items-center justify-content-center">
      <Row className="w-100">
        <Col md={6} lg={4} className="mx-auto">
          <Card className="shadow">
            <Card.Body className="p-4">
              <div className="text-center mb-4">
                <h2 className="h4 text-primary mb-2">Smart Attendance</h2>
                <p className="text-muted">Sign in to your account</p>
              </div>

              {error && (
                <Alert variant="danger" className="mb-3">
                  {error.message}
                </Alert>
              )}

              <Form onSubmit={handleSubmit(onSubmit)}>
                <Form.Group className="mb-3">
                  <Form.Label>Email Address</Form.Label>
                  <Form.Control
                    type="email"
                    placeholder="Enter your email"
                    {...register('email')}
                    isInvalid={!!errors.email}
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.email?.message}
                  </Form.Control.Feedback>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Password</Form.Label>
                  <Form.Control
                    type="password"
                    placeholder="Enter your password"
                    {...register('password')}
                    isInvalid={!!errors.password}
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.password?.message}
                  </Form.Control.Feedback>
                </Form.Group>

                <div className="d-grid mb-3">
                  <LoadingButton
                    type="submit"
                    variant="primary"
                    loading={isSubmitting}
                    loadingText="Signing in..."
                    disabled={isSubmitting}
                  >
                    Sign In
                  </LoadingButton>
                </div>

                <div className="text-center">
                  <div className="d-grid">
                    <Button
                      variant="outline-primary"
                      onClick={handleGoogleLogin}
                      disabled={isSubmitting}
                    >
                      <i className="fab fa-google me-2"></i>
                      Continue with Google
                    </Button>
                  </div>
                </div>

                <hr className="my-4" />

                <div className="text-center">
                  <p className="mb-0">
                    Don't have an account?{' '}
                    <a href="/register" className="text-primary text-decoration-none">
                      Sign up here
                    </a>
                  </p>
                </div>

                <div className="mt-3 p-3 bg-light rounded">
                  <small className="text-muted">
                    <strong>Demo Credentials:</strong><br />
                    Email: admin@attendance.system<br />
                    Password: admin123
                  </small>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default LoginPage;