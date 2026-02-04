# LTI Consumer
Esse repositório contém uma pequena aplicação LTI-compliant (uma plataforma LTI) capaz de registrar learning tools.

## Objetivo
A prova de conceito (PoC ou PdC) consiste em registrar o Moodle como uma Learning Tool e obter informações sobre
atividades realizadas em determinados cursos. Para isso, os seguintes serviços/especificações hão de ser implementadas:

- [x] [LTI Security Framework 1.0](https://www.imsglobal.org/spec/security/v1p0/#authentication-error-response)
- [x] [LTI Dynamic Registration 1.0](https://www.imsglobal.org/spec/lti-dr/v1p0)
- [x] [LTI Core 1.3 (Resource Links & launch)](https://www.imsglobal.org/spec/lti/v1p3/)
- [ ] [LTI Assignment and Grade Services 2.0](https://www.imsglobal.org/spec/lti-ags/v2p0)
- [ ] [LTI Deep Linking](https://www.imsglobal.org/spec/lti-dl/v2p0)

Além disso, outros experimentos estão sendo realizados e testados neste repositório:
- [Strings de mensagens]: um experimento para realizar traduções de mensagens e evitar strings hard-coded
    em português no meio do código e/ou retornar mensagens em inglês para clientes brasileiros, etc.
- [Validações & tratamento de erros]: uma forma elegante de lidar com erros e validações mantendo
    os DTO's pouco acoplados ao framework e utilizando o módulo de strings de mensagens.
- [Erros]: a forma como erros são tratados do núcleo até a saída.

[Strings de mensagens]: ./.github/docs/message-string.md
[Validações & tratamento de erros]: ./.github/docs/validation.md
[Erros]: ./.github/docs/errors.md

## Rodando a aplicação
Siga as instruções do [Guia de Configurações] para configurar e rodar essa prova de conceito.

[Guia de Configurações]: ./.github/docs/setup.md

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

## Configurações LTI 
Boa parte das [configurações para o OIDC] servem para viabilizar a implementação das especificações do LTI.
Classes e métodos específicos do LTI estão no workspace `ltilib` e são feitos para serem desacoplados da aplicação
principal, mas não tão *batteries-included* quanto a bilbioteca oidc-provider.

Por esse motivo, o módulo `lti` contém códigos que usufruem dos mecanismos providenciados pelo NestJS para
montar e utilizar os serviços da `ltilib`.

[configurações para o OIDC]: ./src/oidc/provider.factory.ts
