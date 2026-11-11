# Home Designer

Módulo residencial 3D do HomeLab Studio.

Esta feature será implementada isoladamente para preservar a aplicação e os simuladores herdados do Velxio.

## Primeira fase

- Inspecionar o roteamento, layout, gerenciamento de estado e dependências atuais do frontend.
- Confirmar compatibilidade com Three.js, React Three Fiber e Drei antes de instalar pacotes.
- Criar uma cena mínima sem interferir nas telas existentes.
- Evoluir para cômodos, câmera, seleção e posicionamento de dispositivos.

## Contratos

Os dispositivos residenciais deverão usar IDs estáveis e manter os vínculos de simulação fora dos componentes de renderização. A cena 3D não deve se comunicar diretamente com QEMU; use a camada de integração/eventos definida em `docs/HOMELAB_FOUNDATION.md`.
