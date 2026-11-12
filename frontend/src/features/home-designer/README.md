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
- Encaixe de movimentação em passos de 25 cm, rotação em 15° e escala em passos de 0,1.
- Campos numéricos para posição X/Y/Z e rotação X/Y/Z.
- Dispositivos associados por `roomId` e exibidos somente no ambiente ativo.
- Estado do projeto, ambientes e dispositivos em Zustand.
- Salvamento automático do estado no armazenamento local do navegador via persist middleware do Zustand.

- Alternância entre edição individual e visão geral da residência.
- Planta geral automática em grade de até duas colunas, com cômodos identificados e dispositivos exibidos em seus ambientes.
- Seleção de cômodos e dispositivos na visão geral; transformações continuam disponíveis no modo de edição individual.
- Paredes nos quatro lados dos ambientes, com geometrias vazadas para portas e janelas.
- Adição e remoção de portas e janelas na parede norte, com medidas iniciais e persistência local.

## Dependências

As dependências 3D estão declaradas em `frontend/package.json`. No diretório `frontend`, execute `npm install` para instalá-las e atualizar o lockfile local (o repositório não contém `frontend/package-lock.json`).

## Próximos passos

1. Editor de aberturas com escolha de parede, posição e dimensões.
2. Planta conjunta com posicionamento manual e conexão entre cômodos.
3. Melhorar o posicionamento com encaixe à grade, limites do cômodo e arrastar diretamente sobre o piso.
4. Biblioteca com modelos 3D residenciais mais detalhados.
5. Vínculo ESP32/GPIO e eventos do simulador.
6. API de projetos e sincronização entre dispositivos.

A cena não se comunica diretamente com QEMU. A futura integração deverá passar pela camada de adaptadores e eventos descrita em `docs/HOMELAB_FOUNDATION.md`.

## Limitações atuais

- A visão geral organiza cômodos em uma grade automática; as portas e janelas são aberturas internas de cada cômodo, ainda sem conexão física entre cômodos.
- Nesta primeira versão, novas aberturas são criadas na parede norte com dimensões padrão; ainda não há editor de parede, posição ou dimensões.
- O projeto é salvo automaticamente no navegador atual; ainda não existe sincronização com backend ou nuvem.
- Os modelos 3D são primitivas provisórias.
- A transformação é feita pelo gizmo de eixos; ainda não há encaixe físico aos limites do cômodo nem prevenção de colisões.
