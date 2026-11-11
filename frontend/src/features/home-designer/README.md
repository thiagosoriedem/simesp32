# Home Designer

Módulo residencial 3D do HomeLab Studio, acessível pela rota `/homelab`.

## Implementado

- Cena Three.js via React Three Fiber e Drei.
- Sala inicial com piso, paredes e grade métrica.
- Câmera orbital com zoom.
- Catálogo inicial: ESP32, lâmpada, PIR e interruptor.
- Seleção de dispositivos e painel de propriedades.
- Estado do projeto e dispositivos em Zustand.

## Dependências

As dependências 3D estão declaradas em `frontend/package.json`. No diretório `frontend`, execute `npm install` para instalá-las e atualizar o lockfile local (o repositório não contém `frontend/package-lock.json`).

## Próximos passos

1. Persistência local e API de projetos.
2. Criação/edição de ambientes e dimensões.
3. Posicionamento livre por clique/arraste e transformação dos objetos.
4. Modelos 3D residenciais mais detalhados.
5. Vínculo ESP32/GPIO e eventos do simulador.

A cena não se comunica diretamente com QEMU. A futura integração deverá passar pela camada de adaptadores e eventos descrita em `docs/HOMELAB_FOUNDATION.md`.
