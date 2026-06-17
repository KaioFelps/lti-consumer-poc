# Notações
As notas de implementação utilizam algumas sintaxes para diferenciar claramente
qual o domínio das entidades ou recursos mencionados. Por exemplo: para line items,
há 4 implementações. Embora 2 dessas sejam claramente da plataforma, visto que são
especializações (com o ORM Drizzle e em memória), há os dois identicos
`LtiLineItemsRepository`. Como diferenciá-los?

## Identificador
É um identificador todo nome utilizado para se referenciar a um objeto no sistema.
Isso é, o nome de uma classe é um identificador para a classe. Assim, um identificador
pode identificar uma entidade, um repositório, um DTO ou qualquer outro objeto
relevante o bastante para ser categorizado ou não.

## Ambiguidade
Chama-se ambíguo todo identificador que pode identificar um objeto tanto na biblioteca
_ltilib_ quanto na plataforma de prova de conceito.

---

Sempre que um identificador for ambíguo, será prefixado com os _namespaces_ `ltilib::`
ou `plataforma::`. Quando não há um namespace explícito, assuma que:
1. o identificador é único de um objeto em todo o repositório;
2. o identificador se refere a variante da plataforma, não da biblioteca _ltilib_.
