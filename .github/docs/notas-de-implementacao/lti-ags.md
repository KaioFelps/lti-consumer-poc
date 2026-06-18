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

### Lançamento

O lançamento com sucesso de uma atividade externa — com sucesso, nos referimos não só ao lançamento,
mas à capacidade da ferramenta criar line items e enviar notas de volta para a plataforma — depende
também das configurações da biblioteca _ltilib_ na plataforma. (Vide [Habilitando Os Serviços de Line Items](#habilitando-os-serviços-de-line-items).)

Para conseguirmos passar o contexto para o serviço de lançamento sem termos que criar um endpoint dedicado
a lançar resource links de atividades externas, é necessário um meio de obter o contexto a partir do
_resource link_.

A classe `ltilib::LtiResourceLink` possui o campo contexto, de fato. Assim, o primeiro passo é simplesmente
adicionar o contexto durante a criação do _resource link_ no serviço `CreateExternalLtiAssignmentService`.

> [!WARNING]
> Pensando por algum tempo, pode parecer lógico e eficiente simplesmente aproveitar o contexto que já está associado
> ao _deployment_ "do _resource_link_" para associar também a este. Isso, contudo, é um equívoco.
> O _deployment_ é referente a implantação **da ferramenta a qual o _resource link_ pertence, não ao
> _resource link_ em si**. A ferramenta pode ter sido implantada em um hipotético contexto
> $(\text{DACOM}, departamento)$ ao passo que o _resource link_ deva pertencer ao contexto
> $(\text{Cibersegurança}, curso)$, por exemplo.

Com o contexto disponível no próprio _resource link_, basta um mecanismo de obter esse contexto na fase
de login durante o lançamento LTI, de modo que possamos passá-lo como parâmetro para o serviço que gera
o formulário de submissão para efetivar o lançamento. Isso é o suficiente para que o _claim_ do LTI AGS
seja finalmente apresentado.

## External Resources

Essa plataforma não implementa o uso de contextos nos links externos. Dessa forma, a propriedade
`ltilib::ExternalLtiResource.context` é sempre nula e desprezada.

### Habilitando Os Serviços de Line Items

No módulo `LtiModule`, até então, era passado `undefined` explicitamente no parâmetro `LtiAgsClaimServices`.
Para habilitar o claims de serviços, agora instanciamos a instância de `LtiAgsClaimServices` e passamos
ela como parâmetro na criação do `LtiLaunchesServices`.

Além disso, para a maioria dos serviços do LTI Advantage, e em particular para o AGS, o contexto é deveras
importante. Enquanto ele não é critério obrigatório para um lançamento LTI (LTI Core) bem sucedido, ele é
essencial para os serviços de notas. A biblioteca _ltilib_ ignora silenciosamente vários procedimentos
do LTI Advantage quando não é fornecido nenhum contexto afim de manter compatibilidade com o LTI Core ao
desabilitar as funcionalidades que dependem dele.

Nesse caso, o claim dos serviços do LTI AGS não são incluídos mesmo que o serviço tenha sido fornecido,
a menos que um contexto seja passado na hora de realizar o lançamento. Isso implica mudanças no _endpoint_
de lançamento de atividades.