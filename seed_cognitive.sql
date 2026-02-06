
-- Insert default cognitive assessments for the existing cognitive sub-session
-- Using the ID found: a2835497-31d4-41f3-a302-ec595e08db37

INSERT INTO public.cognitive_test_configs 
(sub_session_id, test_type, name, difficulty_level, time_limit_seconds, instructions_english, instructions_hindi, parameters)
VALUES
(
    'a2835497-31d4-41f3-a302-ec595e08db37', 
    'digit_span_forward', 
    'Memory Match (Forward)', 
    'medium', 
    300, 
    'Remember the sequence of numbers shown and repeat them in the same order.', 
    'दिखाए गए नंबरों के क्रम को याद रखें और उन्हें उसी क्रम में दोहराएं।',
    '{"starting_digits": 3, "max_digits": 9}'
),
(
    'a2835497-31d4-41f3-a302-ec595e08db37', 
    'digit_span_backward', 
    'Memory Match (Reverse)', 
    'hard', 
    300, 
    'Remember the sequence of numbers shown and repeat them in reverse order.', 
    'दिखाए गए नंबरों के क्रम को याद रखें और उन्हें उल्टे क्रम में दोहराएं।',
    '{"starting_digits": 3, "max_digits": 9}'
),
(
    'a2835497-31d4-41f3-a302-ec595e08db37', 
    'flanker_task', 
    'Focus Fish', 
    'medium', 
    180, 
    'Identify the direction of the middle fish while ignoring the distracted fish around it.', 
    'आस-पास की विचलित मछलियों को अनदेखा करते हुए बीच वाली मछली की दिशा पहचानें।',
    '{"trial_count": 20}'
),
(
    'a2835497-31d4-41f3-a302-ec595e08db37', 
    'set_shifting', 
    'Rule Switcher', 
    'hard', 
    240, 
    'Sort cards based on changing rules (Color or Shape). Pay attention to the rule change!', 
    'बदलते नियमों (रंग या आकार) के आधार पर कार्ड छांटें। नियम परिवर्तन पर ध्यान दें!',
    '{"switch_frequency": 5}'
);
