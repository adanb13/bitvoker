from logforge.ai import AI
from logforge.config import Config
from logforge.logger import setup_logger
from logforge.notifier import Notifier

logger = setup_logger("components")


def refresh_server_components(server, force_new_config=False):
    if force_new_config or getattr(server, "config_manager", None) is None:
        server.config_manager = Config()
    config = server.config_manager

    if config.enable_ai:
        if server.ai is None or getattr(server.ai, "preprompt", None) != config.preprompt:
            server.ai = AI(config.preprompt)
    else:
        server.ai = None

    server.notifier = Notifier(config.notification_channels)
    return server
