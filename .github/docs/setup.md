# Guia de Configurações
Este documento contém as configurações necessárias para levantar a aplicação e rodá-la (em desenvolvimento).

## Requisitos Básicos
- [Docker](https://docs.docker.com/engine/install/);
    - Ative a opção "Enable host networking" em Settings > Resources no Docker Desktop.
- [NodeJs & npm](https://nodejs.org/en/download).

### Instalação e configurações iniciais
1. Instale as dependências necessárias com o comando `npm install`.
2. Configure as variáveis de ambiente:
    1. copie a base de variáveis (`cp .env.sample .env`);
    2. gere a chave privada (`node scripts/gen-keys.mjs`), copie e cole-a
        como valor da variável `PRIVATE_KEY_BASE64`;
    3. gere um segredo de aplicação (utilizado para assinar os cookies):
        utilize o comando `[Convert]::ToBase64String((1..64 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }) -as [byte[]])`
        no powershell ou `head -c 64 /dev/urandom | base64` no shell, copie o valor e cole na variável `APP_SECRET`.
3. Levante os contêineres Docker (`docker compose --profile full up`).

## Configurando o Moodle Como Ferramenta LTI
### Container do Moodle com TLS
A biblioteca `oidc-provider` é inflexível quanto ao uso do HTTPS. Durante o registro dinâmico, clientes são obrigados
a assegurarem camada de segurança (é obrigatório utilizar HTTPS ao invés de HTTP) mesmo localmente. Por isso,
os passos abaixo são necessário para conseguir replicar o experimento (que é esta prova de conceito).

1. Instale a ferramenta [`mkcert`] (para gerar certificados locais);
2. navegue para o diretório de certificados (`cd certs`);
3. use o comando `mkcert 127.0.0.1 ::1 host.docker.internal`;
4. instale a nova autoridade de certificados com o comando `mkcert -install`;
5. utilize o comando `cp "$(mkcert -CAROOT)/rootCA.pem" certs` para copiar as autoridades de certificado adicionais;
6. (com o container do moodle rodando,) utilize o comando `docker exec -u 0 -it lti_consumer_poc_moodle update-ca-certificates`.

[`mkcert`]: https://github.com/FiloSottile/mkcert

### Desbloqueando URLs Inseguros (Somente em Desenvolvimento)
- https://127.0.0.1:8443/admin/settings.php?section=httpsecurity
    - desligue a opção "Secure cookies only"
    - remova os valores `localhost`, `127.0.0.0/8` e `192.168.0.0/16` do campo "cURL blocked hosts list"
        - `localhost` e `127.0.0.0/8` se referem a máquina local, por isso precisam ser desbloqueados em desenvolvimento;
        - quando utilizado uma instância do Moodle em algum container Docker, é necessário substituir o host dos URLs
        em que o Moodle fará requisições com cURL para `host.docker.internal`, que será resolvido para um IP na
        faixa `192.168.0.0/16`. Por isso, esta também precisa ser desbloqueada.
    - adicione a porta `3000` no campo "cURL allowed ports list"

---

> [!WARNING]
> Novamente, a biblioteca `oidc-provider` é *deveras inflexível*. Seu Authorization Server se recusa a lidar com
> aplicações locais em vários subserviços. Em outras palavras, tentar registrar o Moodle pelo URL "localhost"
> acarreta o erro "redirect_uris for web clients using implicit flow must not be using localhost".
> Portanto, **acesse e utilize o endereço do moodle pelo IP local (`127.0.0.1`), especialmente durante o registro**.

Para utilizar o Moodle como uma ferramenta LTI, foram realizadas as seguintes configurações:
- https://127.0.0.1:8443/admin/settings.php?section=manageauths
    - Habilite o plugin LTI
- https://127.0.0.1:8443/admin/settings.php?section=manageenrols
    - Habilite o plugin Publish as LTI tool
- https://127.0.0.1:8443/admin/category.php?category=enrolltifolder
    - Email visibility: `Visible to course participants`
    - City/town: *\<empty\>*
    - Select a country: `Brazil`
    - Timezone: `America/Sao_Paulo`
    - Preferred language: `English (en)`
    - Institution: *\<empty\>*
- https://127.0.0.1:8443/admin/settings.php?section=logos
    - Compact logo: envie alguma imagem qualquer.

        O registro dinâmico do OpenID Connect especifica que o campo `logo_uri` é opcional, mas quando presente,
        deve ser um URL válido. A atual implementação do Moodle envia uma string vazia *sempre*, o que fere
        a implementação e é impedido de prosseguir devido as checagens realizadas pela biblioteca `oidc-provider`.
        Colocar uma logo faz com que o Moodle envie uma URL válida e o registro possa ocorrer. Esse problema deveria
        ser reportado no Issue Tracker do Moodle — se é que já não foi —, no entanto não foi possível acessar o site
        no presente momento.

Feito isso, utilize o registro dinâmico para registrar o Moodle como uma ferramenta LTI nesta plataforma:
1. Acesse https://127.0.0.1:8443/admin/settings.php?section=enrolsettingslti_registrations > Register a platform
    - Platform name: Lti Consumer PoC
2. Copie o endereço do campo Registration URL.
3. Acesse https://localhost:3000/lti/register.
4. Cole o endereço de registro do Moodle no campo URL do endpoint de registro da ferramenta.
5. Marque a opção Utilizar host interna do Docker.
    
    Essa opção é necessária para instâncias do Moodle que estejam rodando em containers do Docker. Ela
    substitui o `issuer` dos tokens JWT intercambiados durante o processo de registro de modo que o container
    do Moodle consiga acessar a plataforma no localhost.
6. Clique em Registrar ferramenta LTI.
7. Clique em Finalizar registro.
