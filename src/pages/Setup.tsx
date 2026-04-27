import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { AlertCircle, Loader2, ShieldCheck, Target } from 'lucide-react';
import { toast } from 'sonner';
import { brand } from '@/config/brand';

/**
 * Rota de bootstrap usada APENAS no primeiro acesso após clonar o projeto.
 *
 * Funciona somente enquanto não existir nenhum admin no banco. Depois disso,
 * a página fica permanentemente desativada (qualquer usuário a vê como bloqueada).
 */
export default function Setup() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const [checking, setChecking] = useState(true);
  const [adminExists, setAdminExists] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const check = async () => {
      const { count, error } = await supabase
        .from('user_roles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'admin');
      if (error) {
        setError('Falha ao verificar status do sistema.');
      } else {
        setAdminExists((count ?? 0) > 0);
      }
      setChecking(false);
    };
    check();
  }, []);

  const becomeAdmin = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      // Remove qualquer role default (viewer) e atribui admin.
      // A política "First user can be admin" + WITH CHECK (auth.uid() = user_id) permite isso.
      await supabase.from('user_roles').delete().eq('user_id', user.id);
      const { error: insErr } = await supabase
        .from('user_roles')
        .insert({ user_id: user.id, role: 'admin' });
      if (insErr) throw insErr;
      toast.success('Você agora é o administrador. Faça login novamente para aplicar.');
      await supabase.auth.signOut();
      navigate('/auth', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Erro ao atribuir permissões.');
      setSubmitting(false);
    }
  };

  if (checking || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <Target className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            {brand.name}
          </h1>
          <p className="text-muted-foreground mt-2">Configuração inicial</p>
        </div>

        <Card className="border-t-4 border-t-primary shadow-xl">
          <CardHeader>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              Bootstrap do Administrador
            </h2>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 flex items-center gap-2 text-destructive text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {adminExists ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Esta instância já possui um administrador configurado.
                  Esta página de configuração inicial está desativada.
                </p>
                <Button className="w-full" onClick={() => navigate('/auth')}>
                  Ir para Login
                </Button>
              </div>
            ) : !user ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Para se tornar o administrador desta instância, primeiro
                  crie uma conta normal pela tela de login. Depois volte aqui
                  para receber permissão de admin.
                </p>
                <Button className="w-full" onClick={() => navigate('/auth')}>
                  Criar conta / Entrar
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Nenhum administrador foi criado ainda. Clique no botão abaixo
                  para tornar a sua conta (<strong>{user.email}</strong>) o
                  administrador desta instância.
                </p>
                <p className="text-xs text-muted-foreground">
                  Esta ação só pode ser feita uma vez. Após isso, novos admins
                  só podem ser promovidos por outro admin.
                </p>
                <Button
                  className="w-full gap-2"
                  onClick={becomeAdmin}
                  disabled={submitting}
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  Tornar-me Administrador
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
