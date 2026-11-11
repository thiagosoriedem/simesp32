# HomeLab Studio — Fundação do projeto

## Objetivo

Evoluir este fork do Velxio para uma plataforma de projeto e demonstração de automação residencial, conectando uma casa 3D a placas ESP32, firmware e eventos IoT.

## Decisões confirmadas

- Estratégia: manter o Velxio como base e integrar os novos módulos sem reescrever os simuladores existentes.
- Linguagens de firmware: Arduino C++ e MicroPython.
- Projetista: editor 3D livre, iniciado do zero (não depender de importação de plantas no MVP).
- Repositório: https://github.com/thiagosoriedem/simesp32
- Origem upstream: https://github.com/davidmonterocrespo24/velxio

## Princípios de integração

1. Preservar a estrutura e os motores existentes do Velxio.
2. Isolar o projetista residencial em uma feature própria.
3. Não acoplar componentes Three.js diretamente ao QEMU ou ao processo de compilação.
4. Relacionar casa, cômodos, dispositivos, placas e circuitos por IDs estáveis.
5. Traduzir sinais do simulador para um contrato de eventos do HomeLab por meio de adaptadores.
6. Não presumir que uma rota ou gateway IoT existente já implementa a integração com a cena 3D.

## Arquitetura inicial

- Frontend: React, TypeScript e Vite conforme a base existente.
- Cena 3D: Three.js, React Three Fiber e Drei (dependências adicionadas ao frontend).
- Estado: aproveitar o gerenciamento de estado existente; Zustand somente se necessário.
- Backend: preservar a API atual e estender os serviços existentes.
- Eventos: WebSocket entre backend/adaptadores e frontend.
- Persistência: aproveitar o banco atual; modelagem e migrações serão definidas após inspeção do backend.

## Modelo conceitual inicial

### SmartDevice

- id: identificador estável
- projectId: projeto residencial
- roomId: cômodo
- type: esp32, lamp, switch, motion_sensor, outlet, television, air_conditioner ou outro tipo catalogado
- name: nome apresentado ao usuário
- transform: posição e rotação no ambiente 3D
- state: estado visual/funcional atual
- simulation: vínculo opcional com placa, circuito e firmware

### SimulationBinding

- boardInstanceId: instância da placa no laboratório
- circuitProjectId: circuito associado, quando aplicável
- language: arduino_cpp ou micropython
- gpioMappings: associação explícita entre pinos e funções/dispositivos

### HomeLabEvent

- id, projectId, deviceId
- source: simulator, user ou automation
- type: gpio.changed, sensor.motion, light.changed, switch.pressed, simulation.started ou simulation.stopped
- payload: dados tipados do evento, como pin, value e state
- timestamp

Este contrato pertence ao HomeLab Studio. Adaptadores deverão converter os eventos reais do Velxio para esse formato; não se assume que o simulador já emita esse contrato.

## Fluxo de integração prioritário

1. Usuário posiciona uma ESP32, um sensor PIR e uma lâmpada na sala 3D.
2. Usuário vincula o PIR a um GPIO de entrada e a lâmpada a um GPIO de saída.
3. O laboratório do Velxio executa o firmware escolhido.
4. O adaptador converte a mudança de GPIO em HomeLabEvent.
5. A camada de eventos atualiza o estado do dispositivo na cena 3D.

## MVP — critério de aceite

Criar uma sala 3D, posicionar ESP32 + PIR + lâmpada, vincular pinos, executar um firmware e observar a lâmpada virtual mudar de estado a partir do evento produzido pela simulação.

## Etapas

1. Fundação: mapear a arquitetura real, validar execução local e definir pontos de extensão.
2. Projetista 3D: cena, câmera, cômodos, seleção, posicionamento e salvar/carregar.
3. Catálogo: ESP32, PIR, lâmpada e interruptor com propriedades e vínculos.
4. Laboratório: abrir o simulador existente a partir de uma placa e suportar os dois fluxos de firmware.
5. Eventos: adaptar GPIO e sincronizar estado com a cena.
6. Demonstração: modo apresentação, lista de equipamentos e orçamento.

## Cuidados antes de implementar

- Confirmar versões e bibliotecas instaladas antes de adicionar dependências 3D.
- Identificar como o simulador atual inicia, interrompe e comunica mudanças de GPIO.
- Inspecionar os modelos e migrações existentes antes de criar tabelas.
- Verificar os termos AGPLv3/licença comercial do Velxio antes de distribuir ou oferecer hospedagem do produto.
- Separar commits próprios do HomeLab de commits sincronizados do upstream.

## Estado da implementação

### Entrega inicial do projetista

- Rota `/homelab` registrada no React Router.
- Cena 3D com piso, duas paredes, grade e câmera orbital.
- Catálogo inicial: ESP32, lâmpada, sensor PIR e interruptor.
- Modelos 3D simplificados e seleção de dispositivos na cena.
- Painel de propriedades com edição do nome e remoção.
- Store Zustand com criação de projeto, cômodos e dispositivos.
- Dependências `three`, `@react-three/fiber`, `@react-three/drei` e `@types/three` adicionadas ao `frontend/package.json`.

### Limitações conhecidas desta entrega

- O projeto ainda vive somente no estado da aplicação; persistência local e API ainda precisam ser implementadas.
- O botão de salvar e a criação de múltiplos ambientes ainda são placeholders.
- Os modelos são primitivas geométricas provisórias, não modelos finais de catálogo.
- A cena ainda não está ligada ao simulador ESP32, aos GPIOs ou ao backend.
- A instalação de dependências, o build TypeScript e os testes ainda precisam ser executados em ambiente local.

## Próxima entrega técnica

Implementar persistência e edição real de ambientes (dimensões, nome, criação e remoção), depois adicionar posicionamento por clique/arraste e preparar o adaptador de eventos do simulador. Preservar o simulador original durante essas mudanças.
