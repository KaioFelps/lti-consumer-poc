# LTI Consumer
Esse repositório contém uma pequena aplicação LTI-Compatible capaz de registrar learning tools.

## Objetivo
A prova de conceito consiste em registrar o Moodle como uma Learning Tool e obter informações sobre
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
