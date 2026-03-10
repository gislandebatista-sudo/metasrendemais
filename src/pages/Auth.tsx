import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Loader2, LogIn, UserPlus, Target } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';

const emailSchema = z.string().email('Email inválido');
const passwordSchema = z.string().min(6, 'A senha deve ter no mínimo 6 caracteres');

interface UnlinkedEmployee {
  id: string;
  name: string;
  sector: string;
  role: string;
}

export default function Auth() {
  const { user, isLoading, isColaborador, userRole, signIn } = useAuth();
  const navigate = useNavigate();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Self-registration form
  const [unlinkedEmployees, setUnlinkedEmployees] = useState<UnlinkedEmployee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');

  // Google linking state
  const [needsLinking, setNeedsLinking] = useState(false);
  const [linkingEmployeeId, setLinkingEmployeeId] = useState('');
  const [isLinking, setIsLinking] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && user && !needsLinking) {
      if (isColaborador) {
        navigate('/colaborador', { replace: true });
      } else if (userRole) {
        navigate('/', { replace: true });
      }
    }
  }, [user, isLoading, isColaborador, userRole, navigate, needsLinking]);

  // Check if Google-auth user needs linking
  useEffect(() => {
    if (user && userRole === 'viewer') {
      // New Google user — check if they have an employee link
      const checkLink = async () => {
        const { data } = await supabase
          .from('employees')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (!data) {
          setNeedsLinking(true);
          fetchUnlinkedEmployees();
        }
      };
      checkLink();
    }
  }, [user, userRole]);

  const fetchUnlinkedEmployees = async () => {
    setLoadingEmployees(true);
    try {
      const { data, error } = await supabase.functions.invoke('self-register', {
        body: { action: 'list_unlinked_employees' },
      });
      if (error) throw error;
      setUnlinkedEmployees(data.employees || []);
    } catch (err) {
      console.error('Error fetching employees:', err);
    } finally {
      setLoadingEmployees(false);
    }
  };

  // Fetch unlinked employees when signup tab is activated
  const handleTabChange = (value: string) => {
    if (value === 'signup' && unlinkedEmployees.length === 0) {
      fetchUnlinkedEmployees();
    }
    setError(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    try {
      emailSchema.parse(loginEmail);
      passwordSchema.parse(loginPassword);
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message);
        return;
      }
    }
    
    setIsSubmitting(true);
    const { error } = await signIn(loginEmail, loginPassword);
    
    if (error) {
      setError(error.message.includes('Invalid login credentials') 
        ? 'Email ou senha incorretos' 
        : error.message);
      setIsSubmitting(false);
    } else {
      toast.success('Login realizado com sucesso!');
    }
  };

  const handleSelfRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!selectedEmployeeId) {
      setError('Selecione seu nome na lista');
      return;
    }

    try {
      emailSchema.parse(registerEmail);
      passwordSchema.parse(registerPassword);
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message);
        return;
      }
    }
    
    if (registerPassword !== registerConfirmPassword) {
      setError('As senhas não coincidem');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke('self-register', {
        body: {
          action: 'register',
          email: registerEmail,
          password: registerPassword,
          employee_id: selectedEmployeeId,
        },
      });

      if (fnError) throw fnError;
      if (data?.error) {
        setError(data.error);
        setIsSubmitting(false);
        return;
      }

      // Auto-login after registration
      const { error: loginError } = await signIn(registerEmail, registerPassword);
      if (loginError) {
        toast.success('Conta criada! Faça login com suas credenciais.');
        setIsSubmitting(false);
      } else {
        toast.success('Cadastro realizado com sucesso!');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao realizar cadastro');
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin + '/auth',
      });
      if (result?.error) {
        setError('Erro ao conectar com Google');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao conectar com Google');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLinkGoogleUser = async () => {
    if (!linkingEmployeeId) {
      setError('Selecione seu nome na lista');
      return;
    }

    setIsLinking(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error: fnError } = await supabase.functions.invoke('self-register', {
        body: {
          action: 'link_google_user',
          employee_id: linkingEmployeeId,
        },
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : undefined,
      });

      if (fnError) throw fnError;
      if (data?.error) {
        setError(data.error);
        setIsLinking(false);
        return;
      }

      toast.success('Vinculação realizada com sucesso!');
      setNeedsLinking(false);
      // Force refresh auth state
      window.location.href = '/colaborador';
    } catch (err: any) {
      setError(err.message || 'Erro ao vincular conta');
      setIsLinking(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Google user needs linking
  if (needsLinking && user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/50 p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
              <Target className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Rende +
            </h1>
            <p className="text-muted-foreground mt-2">Vincule sua conta ao seu cadastro</p>
          </div>

          <Card className="border-t-4 border-t-primary shadow-xl">
            <CardHeader className="pb-4">
              <h2 className="text-lg font-semibold">Selecione seu nome</h2>
              <p className="text-sm text-muted-foreground">
                Para completar seu cadastro, selecione seu nome na lista abaixo.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 flex items-center gap-2 text-destructive text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              {loadingEmployees ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Seu Nome</Label>
                  <Select value={linkingEmployeeId} onValueChange={setLinkingEmployeeId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione seu nome..." />
                    </SelectTrigger>
                    <SelectContent>
                      {unlinkedEmployees.map(emp => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.name} — {emp.sector}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Button 
                className="w-full gap-2" 
                onClick={handleLinkGoogleUser} 
                disabled={isLinking || !linkingEmployeeId}
              >
                {isLinking ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                Vincular e Acessar
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/50 p-4">
      <div className="w-full max-w-md">
        {/* Logo / Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <Target className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Rende +
          </h1>
          <p className="text-muted-foreground mt-2">
            Sistema de Gestão de Performance
          </p>
        </div>

        <Card className="border-t-4 border-t-primary shadow-xl">
          <Tabs defaultValue="login" className="w-full" onValueChange={handleTabChange}>
            <CardHeader className="pb-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login" className="gap-2">
                  <LogIn className="w-4 h-4" />
                  Entrar
                </TabsTrigger>
                <TabsTrigger value="signup" className="gap-2">
                  <UserPlus className="w-4 h-4" />
                  Cadastrar
                </TabsTrigger>
              </TabsList>
            </CardHeader>

            <CardContent>
              {error && (
                <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30 flex items-center gap-2 text-destructive text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              {/* Login Tab */}
              <TabsContent value="login" className="mt-0 space-y-4">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      disabled={isSubmitting}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password">Senha</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      disabled={isSubmitting}
                      required
                    />
                  </div>

                  <Button type="submit" className="w-full gap-2" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                    Entrar
                  </Button>
                </form>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">ou</span>
                  </div>
                </div>

                <Button 
                  variant="outline" 
                  className="w-full gap-2" 
                  onClick={handleGoogleLogin}
                  disabled={isSubmitting}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Entrar com Google
                </Button>
              </TabsContent>

              {/* Signup Tab */}
              <TabsContent value="signup" className="mt-0">
                <form onSubmit={handleSelfRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Seu Nome</Label>
                    {loadingEmployees ? (
                      <div className="flex items-center gap-2 py-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm text-muted-foreground">Carregando lista...</span>
                      </div>
                    ) : unlinkedEmployees.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-2">
                        Não há colaboradores disponíveis para cadastro. Caso já tenha se cadastrado, faça login.
                      </p>
                    ) : (
                      <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione seu nome..." />
                        </SelectTrigger>
                        <SelectContent>
                          {unlinkedEmployees.map(emp => (
                            <SelectItem key={emp.id} value={emp.id}>
                              {emp.name} — {emp.sector}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-email">Email</Label>
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      disabled={isSubmitting}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-password">Senha</Label>
                    <Input
                      id="register-password"
                      type="password"
                      placeholder="Mínimo 6 caracteres"
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      disabled={isSubmitting}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-confirm">Confirmar Senha</Label>
                    <Input
                      id="register-confirm"
                      type="password"
                      placeholder="Repita a senha"
                      value={registerConfirmPassword}
                      onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                      disabled={isSubmitting}
                      required
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full gap-2" 
                    disabled={isSubmitting || unlinkedEmployees.length === 0}
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                    Criar Conta
                  </Button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">ou</span>
                    </div>
                  </div>

                  <Button 
                    type="button"
                    variant="outline" 
                    className="w-full gap-2" 
                    onClick={handleGoogleLogin}
                    disabled={isSubmitting}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Cadastrar com Google
                  </Button>
                </form>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Ao usar o sistema, você concorda com os termos de uso.
        </p>
      </div>
    </div>
  );
}
