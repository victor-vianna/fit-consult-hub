export const CHAT_CONVERSATION_SEPARATOR = "::";

export function buildChatConversationKey(personalId: string, alunoId: string) {
  return `${personalId}${CHAT_CONVERSATION_SEPARATOR}${alunoId}`;
}

export function getAlunoIdFromConversationKey(conversaKey: string) {
  const [, alunoId] = conversaKey.split(CHAT_CONVERSATION_SEPARATOR);
  return alunoId || null;
}
