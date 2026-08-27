# Meta Ads Library Downloader

Extensão para o Google Chrome que adiciona recursos à Meta Ads Library, facilitando a análise e o download de vídeos de anúncios.

## Para que serve

A extensão permite:

- Baixar vídeos exibidos na Meta Ads Library.
- Exibir há quantos dias cada anúncio está ativo.
- Filtrar anúncios por tempo de veiculação.
- Filtrar anúncios pela chamada para ação (CTA).
- Filtrar por uma categoria de CTA ou por uma CTA específica.

## Instalação

1. Baixe ou clone este repositório.
2. Abra `chrome://extensions` no Chrome.
3. Ative o **Modo do desenvolvedor**.
4. Clique em **Carregar sem compactação**.
5. Selecione a pasta do projeto.
6. Acesse a [Meta Ads Library](https://www.facebook.com/ads/library/).

## Uso

### Download de vídeos

1. Abra a Meta Ads Library.
2. Pesquise os anúncios desejados.
3. Nos anúncios com vídeo, clique em **Baixar vídeo**.
4. O arquivo será salvo na pasta padrão de downloads do Chrome.

### Filtro por tempo ativo

O seletor **Tempo ativo** mostra somente anúncios que estão ativos há pelo menos o período escolhido, como:

- 10 dias ou mais
- 20 dias ou mais
- 30 dias ou mais
- 60 dias ou mais
- 90 dias ou mais

### Filtro por CTA

O seletor **CTA** permite escolher todas as CTAs, uma categoria ou uma CTA específica.

#### Foco em contato

- Fale conosco
- Enviar mensagem
- Enviar mensagem pelo WhatsApp
- Enviar e-mail
- Ligar agora

#### Foco em conversão/vendas

- Comprar agora
- Pedir agora
- Fazer pedido
- Ver cardápio
- Ver ofertas
- Adicionar ao carrinho

#### Foco em cadastro/leads

- Cadastrar-se
- Inscrever-se
- Baixar
- Usar aplicativo

#### Foco em engajamento/informação

- Saiba mais
- Assista ao vídeo
- Salvar
- Jogar

#### Foco em local/evento

- Reserve agora
- Reservar agora
- Como chegar
- Visitar o perfil do Instagram

Os filtros de tempo ativo e CTA podem ser usados ao mesmo tempo.

## Funções principais

- Detecta anúncios carregados dinamicamente na página.
- Identifica a data de início da veiculação.
- Calcula a quantidade de dias ativos.
- Insere a informação de dias junto ao status do anúncio.
- Identifica CTAs em botões e links dos anúncios.
- Reaplica os recursos quando a Meta atualiza ou carrega novos anúncios.
- Solicita o download dos vídeos pelo serviço de downloads do Chrome.

## Arquivos

- `src/content.js`: detecta vídeos e anúncios, cria os botões, badges e filtros.
- `src/service-worker.js`: recebe as solicitações e inicia os downloads.
- `src/styles.css`: estilos dos botões, filtros e badge de dias ativos.
- `manifest.json`: configuração da extensão, permissões, scripts e ícones.
- `assets/logo.png`: logo da extensão.

## Observações

- A extensão funciona na página da Meta Ads Library.
- As classes internas da Meta podem mudar, o que pode exigir ajustes futuros.
- CTAs que não estejam cadastradas no código não serão classificadas pelo filtro.
- O download depende de uma URL de vídeo acessível pelo navegador.

## Licença

Este projeto é destinado a uso pessoal. Respeite os direitos autorais, os termos de uso da Meta e os direitos dos anunciantes ao utilizar os vídeos baixados.
