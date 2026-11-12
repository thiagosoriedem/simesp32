# Home Designer

Módulo residencial 3D do HomeLab Studio, acessível pela rota `/homelab`.

## Implementado

- Cena Three.js via React Three Fiber e Drei.
- Ambientes independentes com seleção na barra lateral.
- Edição de nome, largura, profundidade e pé-direito do ambiente.
- Atualização da geometria 3D conforme as dimensões do ambiente ativo.
- Câmera orbital com zoom.
- Catálogo inicial: ESP32, lâmpada, PIR e interruptor.
- Seleção de dispositivos e painel de propriedades.
- Gizmo 3D para mover, girar e redimensionar o dispositivo selecionado.
- Campos numéricos para posição X/Y/Z e rotação X/Y/Z.
- Dispositivos associados por `roomId` e exibidos somente no ambiente ativo.
- Estado do projeto, ambientes e dispositivos em Zustand.
- Salvamento automático do estado no armazenamento local do navegador via persist middleware do Zustand.

## Dependências

As dependências 3D estão declaradas em `frontend/package.json`. No diretório `frontend`, execute `npm install` para instalá-las e atualizar o lockfile local (o repositório não contém `frontend/package-lock.json`).

## Próximos passos

1. API de projetos e sincronização entre dispositivos.
2. Melhorar o posicionamento com encaixe à grade, limites do cômodo e arrastar diretamente sobre o piso.
3. Biblioteca com modelos 3D residenciais mais detalhados.
4. Vínculo ESP32/GPIO e eventos do simulador.
5. Validação local de TypeScript, build e testes.

A cena não se comunica diretamente com QEMU. A futura integração deverá passar pela camada de adaptadores e eventos descrita em `docs/HOMELAB_FOUNDATION.md`.

## Limitações atuais

- Os ambientes são visualizados individualmente; ainda não existe planta conjunta com cômodos conectados.
- O projeto é salvo automaticamente no navegador atual; ainda não existe sincronização com backend ou nuvem.
- Os modelos 3D são primitivas provisórias.
- A transformação é feita pelo gizmo de eixos; ainda não há encaixe à grade nem limites físicos do cômodo.
