# MCR Serralheria — site multipágina

## Páginas
- `index.html`: página inicial
- `servicos.html`: 10 serviços + pedido personalizado
- `sobre.html`: apresentação e processo de trabalho
- `contato.html`: contatos e formulário para WhatsApp

## Dados configurados
- WhatsApp: (67) 98103-6563
- Instagram: @mcr_serralheria_tl3
- E-mail: mcrserralheriabr@gmail.com

O número no código contém o DDI do Brasil, por isso aparece como `5567981036563` nos links do WhatsApp. Os formulários abrem a conversa em uma nova aba; caso o navegador bloqueie, usam a aba atual.

## Como trocar as imagens
As fotos atuais são temporárias e carregadas por links externos. Para usar arquivos próprios:
1. Crie a pasta `img/servicos`.
2. Coloque as fotos nela, por exemplo: `img/servicos/portao.jpg`.
3. Abra o HTML desejado e substitua o endereço começando com `https://images.pexels.com/...` por `img/servicos/portao.jpg`.
4. O arquivo `img/placeholder-metal.svg` aparece automaticamente caso a imagem externa falhe.

Referências temporárias das fotos: Pexels, páginas 33658802, 9206213, 2315987, 10372450, 6341301, 9654665 e 13278911. Substitua pelas fotos reais antes da publicação definitiva.

## Como trocar o vídeo
Substitua `media/demo-serralheria.mp4` pelo vídeo real mantendo o mesmo nome. Formato recomendado: MP4 (H.264), horizontal, até 20–30 MB para manter o site leve.

## Como publicar no GitHub Pages
Envie todos os arquivos e pastas para a raiz do repositório. Em **Settings → Pages**, escolha a branch `main` e a pasta `/ (root)`.

## Onde alterar cores
Abra `css/style.css` e edite as variáveis no começo do arquivo (`:root`).

## Comportamento do cabeçalho
- A marca permanece à esquerda e o botão do menu fica centralizado.
- O cabeçalho desaparece suavemente ao rolar para baixo e reaparece ao rolar para cima.
- No celular, o menu abre em uma grade compacta de duas colunas para preservar o estilo do computador.

## Página inicial atualizada
- A antiga área “Diferenciais” foi removida.
- A antiga área “Orçamento rápido” foi substituída por um slide técnico sobre agilidade e arquitetura de projetos.
- Os títulos e filtros dos serviços usam uma tipografia técnica mais marcante.

## Animações adicionadas

- O topo da página inicial usa animações em CSS para representar lixadeira, máscara de solda e portão automático.
- As fotos dos serviços recebem uma abertura em estilo Blueprint/CAD ao entrar na tela.
- Os botões geram brilho de metal aquecido e pequenas faíscas.
- O selo rotativo leva para a seção **Garantia de Qualidade** da página Sobre nós.
- Os ícones do Instagram e WhatsApp ficam no lado direito do cabeçalho.


## Trocar o vídeo da seção de serviços

Substitua `media/demo-serralheria.mp4` pelo vídeo definitivo e mantenha exatamente o mesmo nome. O player da página `servicos.html` reconhecerá o novo arquivo automaticamente. Para carregar mais rápido, prefira MP4 em H.264, resolução 1280×720 e tamanho moderado.
