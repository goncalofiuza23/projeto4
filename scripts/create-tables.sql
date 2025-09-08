-- Criar tabela para armazenar metadados dos emails
CREATE TABLE IF NOT EXISTS email_metadata (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email_id VARCHAR(255) UNIQUE NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  column_id UUID REFERENCES custom_columns(id) ON DELETE SET NULL,
  priority VARCHAR(20) DEFAULT 'media',
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_email_metadata_user_id ON email_metadata(user_id);
CREATE INDEX IF NOT EXISTS idx_email_metadata_email_id ON email_metadata(email_id);
CREATE INDEX IF NOT EXISTS idx_email_metadata_column_id ON email_metadata(column_id);

-- Criar função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Criar trigger para atualizar updated_at
CREATE TRIGGER update_email_metadata_updated_at 
    BEFORE UPDATE ON email_metadata 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
