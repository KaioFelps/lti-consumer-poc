# Discovering and launching resource links

Resource links are the mechanism to access external resources from the platform. They
are registered manually or via deep linking and must be displayed in strategic locations (sometimes
declared by the tool itself through LTI placements).

The pseudo-code below illustrates how to discover, initiate, and launch a resource link according to
the documentation. This entire process is to be implemented in this PoC.

```rb
user :: User;

# ...

LmsPlacement := enum
{
	ContentArea,
	RichTextEditor,
	ActivitiesSection.
	ActivitiesEditor,
}

Link := struct
{
	id 		:: String,
	tool	:: Tool,
	# ...
}

ResourceLink := struct
{
	id			:: String,
	url 		:: String,
	title 		:: String?,
	description :: String?,
	placements 	:: Vec<LmsPlacement> = [LmsPlacement::ActivitiesSection]
}

DeepLinkingButton := struct
{
	url 		:: String,
	title 		:: String?,
	description :: String?,
	placements 	:: Vec<LmsPlacement> = [LmsPlacement::ContentArea]
}

SupportedMessage := struct
{
	client_id		:: String,
	type			:: String,
	label			:: String?,
	placements		:: String?,
	target_link_uri	:: String?,
	icon_uri		:: String?,
	custom_params	:: Json?,
	roles			:: Vec<String>
}

@[RestController]
MainController := class
{
	private platform :: Platform
	private launch_repository :: LaunchRepository
	private registrations_repository :: RegistrationRepository

	@[Post("/initiate-launch-login/{resource-link-id}")]
	initiate_login: String -> Task<Result<HttpRedirect>>
	async initiate_login(id) :=
	{
		resource_link := Link::find_by_id(id)
		launch_id := self->launch_repository->save(resource_link->id)
		# gera o GET pro redirect_uri com os parâmetros corretos para
		# redirecionar via GET ao invés de POST com formulário e autosubmit
		launch_initiation_request := InitiateLaunchRequest::create(resource_link, self->platform, launch_id)
		return redirect(launch_initiation_request->into_url())
	}

	@[Post("/launch-login")]
	async launch(@[FormBody] authentication_request_body, @[Session] session) :=
	{
		{
			lti_message_hint as launch_id,
			login_hint,
			state,
			redirect_uri,
			client_id,
			nonce,
		} := authentication_request_body

		client := self->registration_repository->find_by_id(client_id)
		if !client->redirect_uris->has(redirect_uri) || login_hint != user->id
		{
			# authentication error response as per [OIDC Core 3.1.2.6]
			# [OIDC Core 3.1.2.6](https://openid.net/specs/openid-connect-core-1_0.html#AuthError)
			return get_authentication_error_response()
		}

		resource_link_id := self->launch_repository->find_by_id(launch_id)
		resource_link := Link::find_by_id(resource_link_id)

		# Monta os claims, prepara o id_token, prepara o redirect para o target_link_uri
		launch_request := ResourceLinkLaunchRequest::create(resource_link, self->platform, nonce, state)
		return redirect(launch_request->into_url())
	}

	@[Get("/")]
	render_home : () -> Task<Result<Html>>
	async render_home() :=
	{
		resource_links := Link::all()?

		resource_links_tools_supported_messages :: Vec<(String, SupportedMessage)> = resource_links
			->map(link => link->tool)
			->stripDuplicates()
			->map(tool =>
				{
					message := SupportedMessage::find(type = "LtiResourceLinkRequest", tool = tool)
					return tool->id, message
				})

		resource_links_tools_supported_messages :: HashMap<String, SupportedMessage>
			= HashMap::from(resource_links_tools_supported_messages)

		resource_links = resource_links
			->filter((link) =>
				{
					# LtiResourceLinkRequest é implicito. Então, se a ferramenta não tiver
					# registrado configurações sobre ela explicitamente, permitimos o link
					# sem restrições
					message := resource_links_tools_supported_messages->get(link->tool->id)
					return !message || !message->roles || message->roles->hasAny(user->roles)
				})
			->map(link =>
				{
					placements := resource_links_tools_supported_messages->get(link->tool->id)?->placements
					return ResourceLink
					{
						.id				= link->id,
						.url			= fmt("/initiate-launch-login/{link->id}"),
						.title			= link->title,
						.description	= link->description,
						.placements		= placements ?? ..default()
					}
				})

		return render("home", { resource_links, deep_linking_buttons })
	}
}
```
