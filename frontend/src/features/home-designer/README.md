# Home Designer

Módulo residencial 3D do HomeLab Studio, acessível pela rota `/homelab`.

## Implementado

- Cena Three.js via React Three Fiber e Drei.
- Ambientes independentes com seleção na barra lateral.
- Edição de nome, largura, profundidade e pé-direito do ambiente.
- Atualização da geometria 3D conforme as dimensões do ambiente ativo.
- Câmera orbital com zoom.
- Catálogo inicial: ESP32, lâmpada, PIR, interruptor, tomada, televisão e ar-condicionado.
- Seleção de dispositivos e painel de propriedades.
- Gizmo 3D para mover, girar e redimensionar o dispositivo selecionado.
- Encaixe de movimentação em passos de 25 cm, rotação em 15° e escala em passos de 0,1.
- Campos numéricos para posição X/Y/Z e rotação X/Y/Z.
- Dispositivos associados por `roomId` e exibidos somente no ambiente ativo.
- Estado do projeto, ambientes e dispositivos em Zustand.
- Salvamento automático do estado no armazenamento local do navegador via persist middleware do Zustand.

- Alternância entre edição individual e visão geral da residência.
- Planta geral com posicionamento persistente por coordenadas X/Z; cômodos antigos sem coordenadas recebem posições de fallback em grade.
- Campos de posição X/Z no inspetor para organizar manualmente os cômodos e aproximar/encostar ambientes.
- Seleção de cômodos e dispositivos na visão geral; transformações continuam disponíveis no modo de edição individual.
- Paredes nos quatro lados dos ambientes, com geometrias vazadas para portas e janelas.
- Adição, remoção e edição de portas e janelas nas quatro paredes.
- Editor de abertura com parede, posição, largura, altura e peitoril da janela; valores limitados às dimensões do cômodo.
- Geometria de paredes com material opaco de dupla face e normais recalculadas para evitar faces invisíveis.
- Detecção de cômodos adjacentes por coordenadas e alinhamento de portas; na visão geral, a parede duplicada é ocultada quando existe uma porta válida na parede compartilhada.
- Fixação de dispositivos no piso ou em uma das quatro paredes, com orientação automática para o interior do cômodo.
- Ajuste da posição ao longo da parede e da altura em relação ao piso; dispositivos fixados à parede acompanham alterações nas dimensões do ambiente.

## Dependências

As dependências 3D estão declaradas em `frontend/package.json`. No diretório `frontend`, execute `npm install` para instalá-las e atualizar o lockfile local (o repositório não contém `frontend/package-lock.json`).

## Próximos passos

1. Validar colisões entre aberturas e conexões de cômodos com diferentes dimensões e níveis.
2. Melhorar o posicionamento de dispositivos com encaixe à grade, limites do cômodo e arrastar diretamente sobre o piso.
3. Biblioteca com modelos 3D residenciais mais detalhados.
4. Vínculo ESP32/GPIO e eventos do simulador.
5. API de projetos e sincronização entre dispositivos.

A cena não se comunica diretamente com QEMU. A futura integração deverá passar pela camada de adaptadores e eventos descrita em `docs/HOMELAB_FOUNDATION.md`.

## Limitações atuais

- A posição dos cômodos é manual por coordenadas. A conexão de portas é inferida na visão geral e ainda não cria uma malha arquitetônica única nem valida todos os casos de sobreposição.
- A edição de aberturas limita dimensões e posição à parede; ainda não há validação de colisão entre duas aberturas sobrepostas.
- O projeto é salvo automaticamente no navegador atual; ainda não existe sincronização com backend ou nuvem.
- Os modelos 3D são primitivas provisórias.
- A transformação de dispositivos no piso é feita pelo gizmo de eixos; os dispositivos fixados em paredes usam controles de parede/posição/altura. Ainda não há prevenção de colisões entre objetos.
