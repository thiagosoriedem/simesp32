# Home Designer

Módulo residencial 3D do HomeLab Studio, acessível pela rota `/homelab`.

## Implementado

- Cena Three.js via React Three Fiber e Drei.
- Alternância entre visualização 3D do cômodo, planta baixa 2D do cômodo ativo, planta geral 2D editável e visão geral 3D da residência.
- Planta baixa 2D em SVG com paredes, portas, janelas, móveis e dispositivos IoT.
- Planta geral 2D em SVG com arraste de cômodos e reposicionamento de portas/janelas diretamente nas paredes; usa as coordenadas e aberturas já persistidas no modelo dos ambientes.
- Navegação da planta geral com zoom de 35% a 300%, controles de aproximação/afastamento e pan por arraste no fundo; o mapeamento de coordenadas considera a transformação visual para manter o arraste dos cômodos e aberturas preciso.
- Cotas dimensionais externas em metros para largura e profundidade de cada cômodo.
- Redimensionamento direto pelas alças azuis nas quatro paredes, com grade de 25 cm, dimensão mínima de 1 m e bloqueio quando o novo contorno sobrepõe outro cômodo.
- Seleção e reposicionamento por arraste na planta 2D; móveis passam pela mesma validação geométrica de colisões e limites usada no editor 3D.
- Grade de posicionamento de 25 cm na planta 2D; alterações atualizam os mesmos objetos Zustand usados pela cena 3D.
- Ambientes independentes com seleção na barra lateral.
- Edição de nome, largura, profundidade e pé-direito do ambiente.
- Atualização da geometria 3D conforme as dimensões do ambiente ativo.
- Câmera orbital com zoom.
- Catálogo de dispositivos IoT: ESP32, lâmpada, PIR, interruptor, tomada, televisão e ar-condicionado.
- Biblioteca de móveis e objetos: cama, sofá, mesa, cadeira, guarda-roupa, geladeira, pia/bancada e chuveiro.
- Móveis/objetos possuem modelo de dados próprio (`HomeFurniture`), separado de dispositivos IoT, com dimensões editáveis, seleção, transformação 3D e persistência local.
- A posição inicial é escolhida por busca em grade, respeitando o espaço livre do cômodo.
- Móveis podem ser reposicionados arrastando o piso após selecionar o item; gizmo e arraste passam por validação geométrica.
- A validação considera dimensões, escala, rotação no eixo Y, limites internos do cômodo, afastamento de paredes, colisão entre móveis e uma faixa livre de 85 cm diante de portas.
- A checagem de colisões é isolada por cômodo; móveis de ambientes diferentes não colidem entre si.
- Móveis e objetos aparecem tanto na edição do cômodo quanto na visão geral da residência.
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

1. Validar a prevenção de sobreposição entre cômodos e aberturas em paredes diferentes, incluindo cômodos encostados e arrastes rápidos.
2. Adicionar cotas externas completas e ferramenta de enquadramento automático baseada na seleção na planta geral.
3. Melhorar o posicionamento de dispositivos com encaixe em paredes, limites e prevenção de colisões.
4. Modelos 3D residenciais mais detalhados e refinamento das zonas de circulação junto a portas e janelas.
5. Vínculo ESP32/GPIO e eventos do simulador.
6. API de projetos e sincronização entre dispositivos.

A cena não se comunica diretamente com QEMU. A futura integração deverá passar pela camada de adaptadores e eventos descrita em `docs/HOMELAB_FOUNDATION.md`.

## Limitações atuais

- A posição dos cômodos é manual por coordenadas. A conexão de portas é inferida na visão geral e ainda não cria uma malha arquitetônica única nem valida todos os casos de sobreposição.
- A edição de aberturas limita dimensões e posição à parede; ainda não há validação de colisão entre duas aberturas sobrepostas.
- O projeto é salvo automaticamente no navegador atual; ainda não existe sincronização com backend ou nuvem.
- Os modelos 3D de dispositivos e móveis são primitivas provisórias. A prevenção de colisões usa caixas delimitadoras retangulares aproximadas, não malhas detalhadas; ainda não existe física, detecção de colisão entre móveis e dispositivos IoT, nem validação de passagem para todos os tipos de abertura.
- Na planta 2D do cômodo, móveis e dispositivos no piso podem ser arrastados; a grade de 25 cm é aplicada ao posicionamento. Dispositivos fixados em paredes não podem ser arrastados nessa vista. A planta do cômodo ainda não oferece pan/zoom dedicado;
- Na planta geral 2D, cômodos podem ser arrastados e portas/janelas reposicionadas nas paredes com grade de 25 cm. O arraste impede sobreposição entre cômodos e entre aberturas da mesma parede. O pan/zoom, cotas externas e redimensionamento pelas alças estão disponíveis; ainda não há ferramenta de enquadramento automático baseada na seleção;
- A transformação de dispositivos no piso é feita pelo gizmo de eixos; os dispositivos fixados em paredes usam controles de parede/posição/altura. Ainda não há prevenção de colisões entre objetos.
