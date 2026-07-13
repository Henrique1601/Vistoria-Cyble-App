# Checklist de Manutenção

## Antes de cada uso diário
- [ ] Verificar se o aviso de "pendentes" está zerado
- [ ] Confirmar que todas as fotos foram sincronizadas

## Quando houver atualização de código
- [ ] Rodar `npm run build` para verificar erros
- [ ] Testar fluxo completo: PIN → Bloco → Apt → Foto → Sync
- [ ] Testar cenário offline (desligar Wi-Fi)
- [ ] Verificar se o Service Worker atualiza no celular

## Variáveis de Ambiente (Vercel)
- [ ] `APP_PIN` configurado
- [ ] `BLOB_READ_WRITE_TOKEN` ativo (via Storage)

## Limitações Conhecidas
- Trocar celular antes de sincronizar tudo = perda de fotos
- Cada dispositivo tem IndexedDB independente (sem sync entre aparelhos)
- Sem paginação na lista (~180 aptos por bloco funciona bem)

## Evoluções Futuras Possíveis
- [ ] Progresso compartilhado (banco central)
- [ ] Paginação na lista de apartamentos
- [ ] Relatório/exportação de fotos
- [ ] Notificação quando sync completar
