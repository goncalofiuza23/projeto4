"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface UserAvatarProps {
  name?: string | null;
  email: string;
  imageUrl?: string | null;
  className?: string;
}

// Função para gerar uma cor de fundo consistente baseada no email
const stringToColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c = (hash & 0x00ffffff).toString(16).toUpperCase();
  return "#" + "00000".substring(0, 6 - c.length) + c;
};

// Função para extrair as iniciais (ex: "Gonçalo Ferreira" -> "GF")
const getInitials = (name?: string | null, email?: string) => {
  if (name) {
    const names = name.split(" ");
    if (names.length >= 2) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return names[0][0].toUpperCase();
  }
  if (email) {
    return email[0].toUpperCase();
  }
  return "?";
};

export function UserAvatar({
  name,
  email,
  imageUrl,
  className = "h-10 w-10",
}: UserAvatarProps) {
  const initials = getInitials(name, email);
  const backgroundColor = stringToColor(email);

  // Determinar a cor do texto (preto ou branco) baseada na cor de fundo para garantir contraste
  const r = parseInt(backgroundColor.slice(1, 3), 16);
  const g = parseInt(backgroundColor.slice(3, 5), 16);
  const b = parseInt(backgroundColor.slice(5, 7), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  const textColor = yiq >= 128 ? "text-slate-900" : "text-white";

  return (
    <Avatar className={className}>
      {imageUrl && <AvatarImage src={imageUrl} alt={name || email} />}
      <AvatarFallback
        style={{ backgroundColor }}
        className={`${textColor} font-medium text-sm`}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
