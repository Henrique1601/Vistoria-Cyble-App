# 📦 Central de Releases & Instaladores — Vistoria Cyble

Este diretório armazena todos os pacotes executáveis e instaláveis oficiais do sistema **Vistoria Cyble**, organizados por arquitetura e modelo de distribuição.

---

## 📱 Modelos de Distribuição Disponíveis

| Arquivo | Modelo | Tecnologia | Tamanho | Package ID | Descrição |
| :--- | :---: | :---: | :---: | :---: | :--- |
| [`cyble-twa-release.apk`](./cyble-twa-release.apk) | **TWA** | Google Bubblewrap (Android Activity) | ~1.25 MB | `com.cyble.app` | Casca nativa ultraleve que carrega o PWA oficial com atualizações instantâneas via nuvem (sem reinstalação). |
| [`cyble-native-release.apk`](./cyble-native-release.apk) | **Nativo Real** | React Native (Expo Bare + Hermes) | ~87.9 MB | `com.cyble.nativeapp` | Aplicativo 100% nativo universal (todas as CPUs: arm64-v8a, armeabi-v7a, x86, x86_64) com banco local offline, controle de lanterna/torch da câmera e sincronização contínua. |

---

## 📲 Como Instalar e Testar no Celular:

1. **Baixar o arquivo desejado:** Transfira o arquivo `.apk` para o celular Android via WhatsApp, Google Drive, cabo USB ou Telegram.
2. **Autorizar fontes:** Se o Android solicitar, permita *"Instalar de fontes desconhecidas"* para o aplicativo pelo qual você baixou.
3. **Instalação lado a lado:** Como os Package IDs são diferentes (`com.cyble.app` vs `com.cyble.nativeapp`), você pode manter **ambos instalados no mesmo celular simultaneamente** para comparação em campo.

---

## 🔐 Permissões Nativas Inclusas

* `android.permission.CAMERA` — Registro fotográfico de hidrômetros e laudos.
* `android.permission.FLASHLIGHT` — Acionamento de lanterna física em caixas escuras e garagens (App Nativo).
* `android.permission.ACCESS_FINE_LOCATION` — Coordenadas GPS de auditoria para o carimbo da foto.
* `android.permission.INTERNET` — Conexão segura e envio das fotos ao Vercel Blob e Neon PostgreSQL.
