import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { MessageSquare, Save, Target, Calendar, AlertCircle, CheckCircle, Clock, XCircle, Upload, Trash2, Download, Eye, Loader2, Plus, ListTodo } from 'lucide-react';
import { Goal, getGoalStatus, getStatusLabel, getStatusColor } from '@/types/employee';
import { cn, formatDateBR } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface GoalAttachment {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  created_at: string;
}

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  completed_at: string | null;
  sort_order: number;
}

interface GoalObservationsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal: Goal;
  goalType: 'macro' | 'sectoral';
  onSave: (observations: string) => void;
}

const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'image/jpeg',
  'image/png',
];

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export function GoalObservationsModal({ 
  open, 
  onOpenChange, 
  goal, 
  goalType,
  onSave 
}: GoalObservationsModalProps) {
  const [observations, setObservations] = useState(goal.observations || '');
  const [attachments, setAttachments] = useState<GoalAttachment[]>([]);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingAttachments, setIsLoadingAttachments] = useState(false);
  const [isLoadingChecklist, setIsLoadingChecklist] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isAdmin } = useAuth();

  useEffect(() => {
    if (open) {
      setObservations(goal.observations || '');
      fetchAttachments();
      fetchChecklistItems();
    }
  }, [open, goal.observations, goal.id]);

  const fetchAttachments = async () => {
    if (!goal.id) return;
    
    setIsLoadingAttachments(true);
    try {
      const { data, error } = await supabase
        .from('goal_attachments')
        .select('*')
        .eq('goal_id', goal.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAttachments(data || []);
    } catch (error) {
      console.error('Error fetching attachments:', error);
    } finally {
      setIsLoadingAttachments(false);
    }
  };

  const fetchChecklistItems = async () => {
    if (!goal.id) return;
    
    setIsLoadingChecklist(true);
    try {
      const { data, error } = await supabase
        .from('goal_checklist_items')
        .select('*')
        .eq('goal_id', goal.id)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setChecklistItems(data || []);
    } catch (error) {
      console.error('Error fetching checklist items:', error);
    } finally {
      setIsLoadingChecklist(false);
    }
  };

  const status = getGoalStatus(goal.deadline, goal.deliveryDate);
  
  const getStatusIcon = () => {
    switch (status) {
      case 'early': return <CheckCircle className="w-4 h-4" />;
      case 'on_time': return <Clock className="w-4 h-4" />;
      case 'late': return <AlertCircle className="w-4 h-4" />;
      case 'not_delivered': return <XCircle className="w-4 h-4" />;
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      toast.error('Tipo de arquivo não permitido', {
        description: 'Formatos aceitos: PDF, Word, Excel, TXT, JPG, PNG',
      });
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast.error('Arquivo muito grande', {
        description: 'O tamanho máximo permitido é 20MB.',
      });
      return;
    }

    setIsUploading(true);
    try {
      // Generate unique file path
      const fileExt = file.name.split('.').pop();
      const filePath = `${goal.id}/${Date.now()}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('goal-attachments')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Save reference in database
      const { error: dbError } = await supabase
        .from('goal_attachments')
        .insert({
          goal_id: goal.id,
          file_name: file.name,
          file_path: filePath,
          file_type: file.type,
          file_size: file.size,
        });

      if (dbError) throw dbError;

      toast.success('Arquivo enviado com sucesso!');
      fetchAttachments();
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Erro ao enviar arquivo');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteAttachment = async (attachment: GoalAttachment) => {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('goal-attachments')
        .remove([attachment.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('goal_attachments')
        .delete()
        .eq('id', attachment.id);

      if (dbError) throw dbError;

      toast.success('Arquivo removido!');
      setAttachments(prev => prev.filter(a => a.id !== attachment.id));
    } catch (error) {
      console.error('Error deleting attachment:', error);
      toast.error('Erro ao remover arquivo');
    }
  };

  const handleDownload = async (attachment: GoalAttachment) => {
    try {
      const { data, error } = await supabase.storage
        .from('goal-attachments')
        .download(attachment.file_path);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Erro ao baixar arquivo');
    }
  };

  const handleView = async (attachment: GoalAttachment) => {
    try {
      const { data, error } = await supabase.storage
        .from('goal-attachments')
        .createSignedUrl(attachment.file_path, 3600); // 1 hour expiry

      if (error) throw error;

      window.open(data.signedUrl, '_blank');
    } catch (error) {
      console.error('Error viewing file:', error);
      toast.error('Erro ao visualizar arquivo');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('word') || fileType.includes('document')) return '📝';
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '📊';
    if (fileType.includes('image')) return '🖼️';
    return '📎';
  };

  // Checklist functions
  const handleAddChecklistItem = async () => {
    if (!newChecklistItem.trim() || !goal.id) return;

    try {
      const sortOrder = checklistItems.length;
      const { data, error } = await supabase
        .from('goal_checklist_items')
        .insert({
          goal_id: goal.id,
          text: newChecklistItem.trim(),
          sort_order: sortOrder,
        })
        .select()
        .single();

      if (error) throw error;

      setChecklistItems(prev => [...prev, data]);
      setNewChecklistItem('');
      toast.success('Tarefa adicionada!');
    } catch (error) {
      console.error('Error adding checklist item:', error);
      toast.error('Erro ao adicionar tarefa');
    }
  };

  const handleToggleChecklistItem = async (item: ChecklistItem) => {
    try {
      const newCompleted = !item.completed;
      const { error } = await supabase
        .from('goal_checklist_items')
        .update({
          completed: newCompleted,
          completed_at: newCompleted ? new Date().toISOString() : null,
        })
        .eq('id', item.id);

      if (error) throw error;

      setChecklistItems(prev => prev.map(i => 
        i.id === item.id 
          ? { ...i, completed: newCompleted, completed_at: newCompleted ? new Date().toISOString() : null }
          : i
      ));
    } catch (error) {
      console.error('Error toggling checklist item:', error);
      toast.error('Erro ao atualizar tarefa');
    }
  };

  const handleDeleteChecklistItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('goal_checklist_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      setChecklistItems(prev => prev.filter(i => i.id !== itemId));
      toast.success('Tarefa removida!');
    } catch (error) {
      console.error('Error deleting checklist item:', error);
      toast.error('Erro ao remover tarefa');
    }
  };

  const completedCount = checklistItems.filter(i => i.completed).length;
  const totalCount = checklistItems.length;

  const handleSave = () => {
    onSave(observations);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            Observações / Justificativas
          </DialogTitle>
          <DialogDescription>
            Adicione observações, tarefas e anexe documentos relevantes para esta meta.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Goal Summary */}
          <div className="p-4 bg-muted/30 rounded-lg space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                <span className="font-medium">{goal.name}</span>
              </div>
              <Badge variant="outline" className={cn("text-xs", getStatusColor(status))}>
                {getStatusIcon()}
                <span className="ml-1">{getStatusLabel(status)}</span>
              </Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-3 h-3" />
                <span>Prazo: {formatDateBR(goal.deadline)}</span>
              </div>
              <div className="text-right">
                <span className="font-medium text-primary">Peso: {goal.weight}%</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm pt-2 border-t">
              <span className="text-muted-foreground">Realizado</span>
              <span className="font-semibold">{goal.achieved.toFixed(1)}%</span>
            </div>

            <Badge variant="secondary" className="text-xs">
              Meta {goalType === 'macro' ? 'Macro' : 'Setorial'}
            </Badge>
          </div>

          {/* Checklist Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ListTodo className="w-4 h-4 text-primary" />
                <Label className="text-sm font-medium">Checklist de Tarefas</Label>
              </div>
              {totalCount > 0 && (
                <Badge variant={completedCount === totalCount ? "default" : "secondary"} className="text-xs">
                  {completedCount}/{totalCount} concluídas
                </Badge>
              )}
            </div>

            {isLoadingChecklist ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {checklistItems.length > 0 && (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {checklistItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg group"
                      >
                        <Checkbox
                          checked={item.completed}
                          onCheckedChange={() => handleToggleChecklistItem(item)}
                          disabled={!isAdmin}
                        />
                        <span className={cn(
                          "flex-1 text-sm",
                          item.completed && "line-through text-muted-foreground"
                        )}>
                          {item.text}
                        </span>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteChecklistItem(item.id)}
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {isAdmin && (
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Adicionar nova tarefa..."
                      value={newChecklistItem}
                      onChange={(e) => setNewChecklistItem(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddChecklistItem();
                        }
                      }}
                      className="h-8 text-sm"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAddChecklistItem}
                      disabled={!newChecklistItem.trim()}
                      className="shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                )}

                {checklistItems.length === 0 && !isAdmin && (
                  <p className="text-sm text-muted-foreground italic py-2">
                    Nenhuma tarefa cadastrada.
                  </p>
                )}
              </>
            )}
          </div>

          {/* Observations Field */}
          <div className="space-y-2">
            <Label htmlFor="observations" className="text-sm font-medium">
              Anotações e Justificativas
            </Label>
            <Textarea
              id="observations"
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              placeholder="Adicione observações, justificativas de atraso, comentários do gestor ou colaborador..."
              className="min-h-[120px] resize-none"
              disabled={!isAdmin}
            />
            {!isAdmin && (
              <p className="text-xs text-muted-foreground italic">
                Você possui acesso somente leitura.
              </p>
            )}
          </div>

          {/* Attachments Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Arquivos Anexados</Label>
              {isAdmin && (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="gap-2"
                  >
                    {isUploading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    {isUploading ? 'Enviando...' : 'Anexar Arquivo'}
                  </Button>
                </div>
              )}
            </div>

            {isLoadingAttachments ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : attachments.length > 0 ? (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                  >
                    <span className="text-xl">{getFileIcon(attachment.file_type)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{attachment.file_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(attachment.file_size)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleView(attachment)}
                        title="Visualizar"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDownload(attachment)}
                        title="Baixar"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteAttachment(attachment)}
                          className="text-destructive hover:text-destructive"
                          title="Remover"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic py-2">
                Nenhum arquivo anexado.
              </p>
            )}

            <p className="text-xs text-muted-foreground">
              Formatos aceitos: PDF, Word, Excel, TXT, JPG, PNG (máx. 20MB)
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {isAdmin ? 'Cancelar' : 'Fechar'}
          </Button>
          {isAdmin && (
            <Button onClick={handleSave} className="gap-2">
              <Save className="w-4 h-4" />
              Salvar Observações
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
