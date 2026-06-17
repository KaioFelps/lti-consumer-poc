# LTI AGS

Esse documento contempla a integração do módulo de LTI AGS da _ltilib_ na plataforma
de prova de conceito. Essa implementação mostra que é possível abstrair uma parte
considerável da implementação do protocolo, delegando menos afazeres aos sistemas que
desejam tornarem-se conformantes com o LTI Advantage.

## Notação

Esse documento utiliza as notações definidas no documento [Notações](./notacoes.md).
Esse documento utiliza as palavras [_NÃO_] _PODE_, [_NÃO_] _DEVE_, [_NÃO_] _DEVERIA_,
e suas variações em caixa baixa, porém em negrito, com a mesma semântica das suas
traduções conforme a [RFC 2119](https://datatracker.ietf.org/doc/html/rfc2119).

## Conectando Line Items à Plataforma

A entidade `ltilib::LtiLineItem` **pode** possuir referências para links de recursos
(_resource links_) ou para os recursos, diretamente. Isso é definido pela especificação
do protocolo LTI AGS 2.0, e a biblioteca _ltilib_ implementa essa possibilidade.

A plataforma, por sua vez, possui atividades (`Assignment`), estruturas específicas dessa
plataforma.  Essas atividades **podem** receber notas por meio das entidades `Grade`.

O boletim foi idealizado para ser calculado sob demanda, e portanto não constitui uma
estrutura fixa.

### Implementação

Para integrar as `Grades` (notas de uma atividade) com os `ltilib::LtiLineItem`, é necessário introduzir
estruturas intermediárias: a _ltilib_ **não deve** ter ciência da existência de atividades,
pois são estruturas específicas das plataformas a utilizando — como é o caso desta.

Além do mais, uma plataforma normalmente não depende exclusivamente do protocolo LTI para
a realização de suas atividades. Enquanto esse é o caso para essa plataforma, em particular,
implementamos o módulo de atividades de modo que, teóricamente, existam atividades locais
— entenda por "locais" o fato delas não utilizarem ferramentas LTI. Elas não podem ser
realmente executadas na prática.

A distinção de atividades locais e externas (mais especificamente, externas-LTI) se dá pela
propriedade `Assignment.kind`, que pode assumir uma das variantes `Local` ou `ExternalLti`.

A nível de banco de dados, existem duas tabelas: `assignments` e `lti_assignments`. Uma
atividade tem seu tipo igual a `Local` se, e somente se, não possui um registro atrelado
à ela na tabela `lti_assignments`. Caso contrário, é uma atividade do tipo `ExternalLti`.

> [!TIP]
> Essa implementação suporta a integração de outras fontes de atividades externas.

A tabela `lti_assignments` tem sua chave primária dada pelo próprio ID da atividade ao qual
qualifica. Por exemplo: se uma atividade de ID 1 é externa, existe um registro em `assignments`
com o campo `id` igual a 1, e também um registro em `lti_assignments` com o campo
`assignment_id` igual a 1, sendo que esse segundo registro é o complemento que torna o primeiro
uma atividade do tipo `ExternalLti`.

A tabela `lti_assignments` possui um segundo campo: o identificador do link de recurso ao qual
está associando a atividade externa. Esse campo não compõe a chave, mas **deveria** ser um índice.

### Integração

Esse modelo de tabelas tem uma grande vantagem em relação a um simples campo `kind` na tabela
`assignments`, que é justamente o que o torna funcional: ele nos permite atravessar tabelas
e chegar, a partir do `ltilib::LtiLineItems`, em um `platform::Assignment` (se existir) conforme
o seguinte caminho:
`ltilib::LtiLineItem`$\rightarrow$ `ltilib::LtiResourceLink` $\rightarrow$ `platform::lti_assignments`
$\rightarrow$ `platform::Assignment`.

> [!NOTE]
> Observe que há uma clara separação entre o domínio e os serviços externos, como bancos de dados.
> O mapeamento ocorre em nível de banco de dados na presente implementação, de modo que não seja
> necessário acoplar as entidades da _ltilib_ às da plataforma. É o que buscamos, visto que a
> biblioteca visa ser agnóstica de sistemas e _frameworks_.

## External Resources

Essa plataforma não implementa o uso de contextos nos links externos. Dessa forma, a propriedade
`ltilib::ExternalLtiResource.context` é sempre nula e desprezada.
