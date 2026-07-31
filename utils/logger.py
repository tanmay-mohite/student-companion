"""
Centralized logging configuration.
Provides structured logging for the entire application.
"""

import logging
import os
from datetime import datetime


def setup_logger(app_name="student_companion"):
    """Configure and return the application logger."""
    log_level = os.getenv("LOG_LEVEL", "INFO").upper()
    log_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "logs")

    # Ensure logs directory exists
    os.makedirs(log_dir, exist_ok=True)

    logger = logging.getLogger(app_name)
    logger.setLevel(getattr(logging, log_level, logging.INFO))

    # Avoid duplicate handlers on reload
    if logger.handlers:
        return logger

    # Console handler - colored output
    console_handler = logging.StreamHandler()
    console_handler.setLevel(getattr(logging, log_level, logging.INFO))
    console_format = logging.Formatter(
        "[%(asctime)s] %(levelname)-8s %(name)s - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    console_handler.setFormatter(console_format)
    logger.addHandler(console_handler)

    # File handler - daily log files
    log_file = os.path.join(log_dir, f"app_{datetime.now().strftime('%Y%m%d')}.log")
    file_handler = logging.FileHandler(log_file, encoding="utf-8")
    file_handler.setLevel(logging.DEBUG)
    file_format = logging.Formatter(
        "[%(asctime)s] %(levelname)-8s %(name)s [%(filename)s:%(lineno)d] - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    file_handler.setFormatter(file_format)
    logger.addHandler(file_handler)

    return logger


def get_logger(name=None):
    """Get a child logger for a specific module."""
    base = logging.getLogger("student_companion")
    if name:
        return base.getChild(name)
    return base
