-- Criar tabela para colunas personalizadas
CREATE TABLE IF NOT EXISTS custom_columns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(50) DEFAULT 'bg-gray-100 text-gray-800',
  icon VARCHAR(10) DEFAULT '📁',
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_custom_columns_user_id ON custom_columns(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_columns_position ON custom_columns(user_id, position);

-- Criar trigger para atualizar updated_at
CREATE TRIGGER update_custom_columns_updated_at 
    BEFORE UPDATE ON custom_columns 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Atualizar tabela email_metadata para usar column_id em vez de status fixo
ALTER TABLE email_metadata 
ADD COLUMN IF NOT EXISTS column_id UUID REFERENCES custom_columns(id) ON DELETE SET NULL;

-- Migrar dados existentes (opcional)
-- UPDATE email_metadata SET column_id = NULL WHERE status IS NOT NULL;
