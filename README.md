# LTI Consumer
Esse repositório contém uma pequena aplicação LTI-Compatible capaz de registrar learning tools.

## Objetivo
A prova de conceito (PoC ou PdC) consiste em registrar o Moodle como uma Learning Tool e obter informações sobre
atividades realizadas em determinados cursos.

Além disso, outros experimentos estão sendo realizados e testados neste repositório:
- [Strings de mensagens]: um experimento para realizar traduções de mensagens e evitar strings hard-coded
    em português no meio do código e/ou retornar mensagens em inglês para clientes brasileiros, etc.
- [Validações & tratamento de erros]: uma forma elegante de lidar com erros e validações mantendo
    os DTO's pouco acoplados ao framework e utilizando o módulo de strings de mensagens.
- [Erros]: a forma como erros são tratados do núcleo até a saída.

[Strings de mensagens]: ./.github/docs/message-string.md
[Validações & tratamento de erros]: ./.github/docs/validation.md
[Erros]: ./.github/docs/errors.md

## Relying Party (Client)
Para testar em desenvolvimento o funcionamento do Authorization Server, uma segunda aplicação está
sendo utilizada como um cliente. Esta aplicação está disponível no repositório [oidc-rp-client-experiment].

[oidc-rp-client-experiment]: https://github.com/KaioFelps/oidc-rp-client-experiment

## OIDC
A implementação atual de um provider OIDC permite se autenticar e
autorizar/rejeitar permissões para clientes registrados. Para testar, levante ambos os servidores (este e, em seguida,
o cliente — nesta exata ordem) e acesse a rota `localhost:4000/info` para tentar obter os dados da sua conta neste
resource server.

Se não houver sessão, pela implementação, você deverá se autenticar. Quando autenticado, você deverá conceder (ou não)
as permissões (*grants*) requeridas pelo cliente.

Para deslogar-se, acesse a rota `localhost:3000/oidc/session/end`.

## Moodle Como Ferramenta LTI
Para utilizar o Moodle como uma ferramenta LTI, foram realizadas as seguintes configurações:
- http://localhost/admin/category.php?category=enrolltifolder
    - Email visibility: `Visible to course participants`
    - City/town: *\<empty\>*
    - Select a country: `Brazil`
    - Timezone: `America/Sao_Paulo`
    - Preferred language: `English (en)`
    - Institution: *\<empty\>*
- http://localhost/admin/settings.php?section=enrolsettingslti_registrations > Register a platform
    - Platform name: Lti Consumer PoC
    - Tool details

        Modifique as informações no arquivo [`./moodleToolData.ts`] de acordo com as informações que o Moodle forneceu.
    
    - Platform details > Edit platform details

        Preencha os campos da seguinte forma:
        - Platform ID (issuer): `http://localhost:3000/oidc`
        - Client ID: *\<coloque o campo `clientId` do objeto em [`./moodleToolData.ts`] \>*
        - Authentication request URL: `http://localhost:3000/oidc/auth`
        - Public keyset URL: `http://localhost:3000/oidc/jwks`
        - Access token URL: `http://localhost:3000/oidc/token`
    
    - Platform details > Deployments

        Adicione um deployment com as informações contidas no primeiro objeto da lista `deployments` em [`./moodleToolData.ts`].
        Se necessário, adicione mais deployments no array.

[`./moodleToolData.ts`]: ./moodleToolData.ts

## Desbloqueando URLs Inseguros (Somente em Desenvolvimento)
- http://localhost/admin/settings.php?section=httpsecurity
    - desligue a opção "Secure cookies only"
    - remova os valores `localhost`, `127.0.0.0/8` e `192.168.0.0/16` do campo "cURL blocked hosts list"
        - `localhost` e `127.0.0.0/8` se referem a máquina local, por isso precisam ser desbloqueados em desenvolvimento;
        - quando utilizado uma instância do Moodle em algum container Docker, é necessário substituir o host dos URLs
        em que o Moodle fará requisições com cURL para `host.docker.internal`, que será resolvido para um IP na
        faixa `192.168.0.0/16`. Por isso, esta também precisa ser desbloqueada.
    - adicione a porta `3000` no campo "cURL allowed ports list"

## Configurações LTI 
As seguintes partes do código são implementações das especificações do LTI:

### LTI Dynamic Registration
- Adicionada as configurações específicas do LTI com a classe `ToolConfigurationMetadata` nas configurações do
  [provider] da biblioteca oidc-provider (em `discovery`);
- Habilitada a [feature `register`](https://github.com/panva/node-oidc-provider/blob/main/docs/README.md#featuresregistration)
  no [provider] do oidc-provider para que o registro dinâmico do LTI funcione.

[provider]: ./src/oidc/provider.ts
