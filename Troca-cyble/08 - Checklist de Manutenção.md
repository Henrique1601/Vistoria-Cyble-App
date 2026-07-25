# Checklist de Manutenção

## Antes de cada uso diário
- [ ] Verificar se o aviso de "pendentes" está zerado
- [ ] Confirmar que todas as fotos foram sincronizadas
- [ ] Verificar notificações no sino (badge vermelho = não lidas)

## Quando houver atualização de código
- [ ] Rodar `npm run build` para verificar erros
- [ ] Rodar `npm run lint` para verificar warnings
- [ ] Testar fluxo completo: PIN Admin → Bloco → Apt → Foto → Sync
- [ ] Testar fluxo Viewer: PIN Viewer → visualizar fotos → verificar que não edita
- [ ] Testar cenário offline (desligar Wi-Fi)
- [ ] Verificar se o Service Worker atualiza no celular
- [ ] Testar ProgressToast durante sync
- [ ] Testar agendamentos (criar, editar, excluir)
- [ ] Testar exportação (CSV, PDF, XLSX)
- [ ] Testar busca global com status dots

## Variáveis de Ambiente (Vercel)
- [ ] `ADMIN_PIN` configurado
- [ ] `VIEWER_PIN` configurado
- [ ] `APP_PIN` configurado (legado, opcional)
- [ ] `BLOB_READ_WRITE_TOKEN` ativo (via Storage)
- [ ] `DATABASE_URL` configurado (Neon PostgreSQL)
- [ ] `BLOB_STORE_ID` configurado
- [ ] `BLOB_WEBHOOK_PUBLIC_KEY` configurado

## Segurança
- [ ] Verificar que mutations requerem Admin PIN
- [ ] Verificar que reads aceitam Viewer PIN
- [ ] Verificar que upload rejeita Viewer PIN
- [ ] Verificar que `lib/auth.ts` valida corretamente

## Limitações Conhecidas
- Trocar celular antes de sincronizar tudo = perda de fotos (usar Backup/Restore)
- Cada dispositivo tem IndexedDB independente (sem sync entre aparelhos)
- Sem paginação na lista (~180 aptos por bloco funciona bem)
- Vercel Blob: 1GB free tier
- Viewer PIN não pode excluir fotos nem acessar configurações

## Versão Atual
- **App:** 3.2.0
- **SW:** 3.2.0 (deve ser igual ao app)
- **IndexedDB:** v3 (agendamentos store adicionado)
